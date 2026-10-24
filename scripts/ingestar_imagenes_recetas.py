#!/usr/bin/env python3
"""
Script de ingesta validada e idempotente de imágenes de recetas gastronómicas (Bloque 36 - Paso 2).
Aplica estrictamente las reglas R1, R2 y R3:
- R1: Toda imagen se vincula a una receta SOLO por código validado contra parametros.receta_nutricional.
- R2: Desajuste entre el tag del nombre de archivo y los tags almacenados = error fatal con salida no cero.
- R3: Receta sin imagen disponible conserva url_imagen = NULL.
"""

import os
import sys
import argparse
import csv
import hashlib
import re
import shutil
import datetime
import asyncio

def compute_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def normalize_somatotipo(s: str) -> str:
    s = s.upper().strip()
    if s == 'ECTO':
        return 'ECT'
    return s

def parse_tags_from_filename(filename: str):
    m = re.search(r'\[(.*?)[·\-\–\—\s]([A-Z]+)\]', filename)
    if not m:
        return None, None
    soma = m.group(1).strip()
    obj = m.group(2).strip()
    return soma, obj

async def run_ingestion(args):
    if not os.path.isdir(args.origen):
        print(f"ERROR: Directorio origen no existe: {args.origen}", file=sys.stderr)
        sys.exit(1)

    if not os.path.isfile(args.mapeo):
        print(f"ERROR: Archivo de mapeo no existe: {args.mapeo}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.dest, exist_ok=True)

    # 1. Conexión a Base de Datos
    db_recipes = {}
    conn = None
    use_asyncpg = False

    try:
        import asyncpg
        use_asyncpg = True
        conn = await asyncpg.connect(args.db_url)
        rows = await conn.fetch("SELECT codigo, nombre, categoria, somatotipo_afin, objetivo, instrucciones, url_imagen FROM parametros.receta_nutricional;")
        for r in rows:
            db_recipes[r['codigo']] = {
                'codigo': r['codigo'],
                'nombre': r['nombre'],
                'categoria': r['categoria'],
                'somatotipo_afin': r['somatotipo_afin'],
                'objetivo': r['objetivo'],
                'prompt': r['instrucciones'] or '',
                'url_imagen': r['url_imagen']
            }
    except ImportError:
        try:
            import psycopg2
            sync_conn = psycopg2.connect(args.db_url)
            cur = sync_conn.cursor()
            cur.execute("SELECT codigo, nombre, categoria, somatotipo_afin, objetivo, instrucciones, url_imagen FROM parametros.receta_nutricional;")
            for r in cur.fetchall():
                db_recipes[r[0]] = {
                    'codigo': r[0],
                    'nombre': r[1],
                    'categoria': r[2],
                    'somatotipo_afin': r[3],
                    'objetivo': r[4],
                    'prompt': r[5] or '',
                    'url_imagen': r[6]
                }
            cur.close()
            sync_conn.close()
        except Exception as e:
            print(f"ERROR conectando a BD: {e}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR conectando a BD: {e}", file=sys.stderr)
        sys.exit(1)

    # 2. Leer archivo de mapeo CSV
    mapeo_entries = []
    with open(args.mapeo, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            codigo = row.get('codigo', '').strip()
            archivo = row.get('archivo', '').strip()
            if codigo and archivo:
                mapeo_entries.append((codigo, archivo))

    print(f"Cargadas {len(mapeo_entries)} entradas de mapeo desde {args.mapeo}")

    # Exclusión obligatoria del duplicado
    DUPLICADO_EXCLUIDO_NOMBRE = "filete de res magra con papa al horno y ensalada [MESO·GM].jfif"
    DUPLICADO_EXCLUIDO_SHA = "0c5b605135532ab8867750903a9547adc37b936a30a6ac1840dcd4fc5a6e680"

    agregadas = 0
    actualizadas = 0
    sin_cambio = 0
    excluidas = 0

    manifiesto_rows = []
    fecha_hoy = datetime.date.today().isoformat()
    modelo_declarado = "Imagen sintética generada por IA (DALL-E 3 / Flux)"

    updates_to_db = []

    for codigo, archivo in mapeo_entries:
        origen_path = os.path.join(args.origen, archivo)
        if not os.path.isfile(origen_path):
            print(f"ERROR R1: Archivo físico no existe en origen: {archivo}", file=sys.stderr)
            sys.exit(1)

        sha = compute_sha256(origen_path)

        # Regla R1: Validar código existente en base
        if codigo not in db_recipes:
            print(f"ERROR R1 FATAL: Código {codigo} no existe en parametros.receta_nutricional", file=sys.stderr)
            sys.exit(1)

        receta_db = db_recipes[codigo]

        # Regla R2: Validar concordancia estricta de tags
        file_soma, file_obj = parse_tags_from_filename(archivo)
        if not file_soma or not file_obj:
            print(f"ERROR R2 FATAL: No se pudieron parsear tags del archivo {archivo}", file=sys.stderr)
            sys.exit(1)

        norm_file_soma = normalize_somatotipo(file_soma)
        norm_db_soma = normalize_somatotipo(receta_db['somatotipo_afin'])

        if norm_file_soma != norm_db_soma:
            print(f"ERROR R2 FATAL: Desajuste de somatotipo en {archivo}. Tag archivo: {norm_file_soma}, DB: {norm_db_soma}", file=sys.stderr)
            sys.exit(1)

        if file_obj != receta_db['objetivo']:
            print(f"ERROR R2 FATAL: Desajuste de objetivo en {archivo}. Tag archivo: {file_obj}, DB: {receta_db['objetivo']}", file=sys.stderr)
            sys.exit(1)

        # Verificar exclusión obligatoria
        if archivo == DUPLICADO_EXCLUIDO_NOMBRE or sha == DUPLICADO_EXCLUIDO_SHA:
            print(f"-> EXCLUSIÓN OBLIGATORIA APLICADA: {archivo} (Duplicado de REC-022, SHA: {sha})")
            excluidas += 1
            manifiesto_rows.append({
                'codigo': codigo,
                'nombre': receta_db['nombre'],
                'archivo_origen': archivo,
                'alias': "Duplicado de REC-022",
                'sha256': sha,
                'estado': f"EXCLUIDA-DUPLICADO de REC-022",
                'url_imagen': "NO_COPIADO",
                'modelo': modelo_declarado,
                'prompt': receta_db['prompt'],
                'fecha': fecha_hoy
            })
            continue

        # Validar si tiene alias
        alias_nota = ""
        if codigo == "REC-020" and "zapallo" in archivo:
            alias_nota = "Alias: 'zapallo' en archivo por 'zapallito' en catálogo"

        # Copia normalizada por código
        dest_filename = f"{codigo}.jpg"
        dest_path = os.path.join(args.dest, dest_filename)
        dest_url = f"/recetas/{dest_filename}"

        necesita_copia = True
        if os.path.exists(dest_path):
            dest_sha = compute_sha256(dest_path)
            if dest_sha == sha:
                necesita_copia = False

        if necesita_copia:
            shutil.copy2(origen_path, dest_path)
            if receta_db['url_imagen'] == dest_url:
                actualizadas += 1
            else:
                agregadas += 1
        else:
            if receta_db['url_imagen'] == dest_url:
                sin_cambio += 1
            else:
                agregadas += 1

        updates_to_db.append((dest_url, codigo))

        manifiesto_rows.append({
            'codigo': codigo,
            'nombre': receta_db['nombre'],
            'archivo_origen': archivo,
            'alias': alias_nota or "N/A",
            'sha256': sha,
            'estado': "INGESTADA_OK",
            'url_imagen': dest_url,
            'modelo': modelo_declarado,
            'prompt': receta_db['prompt'],
            'fecha': fecha_hoy
        })

    # Actualizar en BD
    if use_asyncpg and conn:
        for dest_url, cod in updates_to_db:
            await conn.execute("UPDATE parametros.receta_nutricional SET url_imagen = $1 WHERE codigo = $2;", dest_url, cod)
        await conn.close()
    elif not use_asyncpg:
        import psycopg2
        sync_conn = psycopg2.connect(args.db_url)
        cur = sync_conn.cursor()
        for dest_url, cod in updates_to_db:
            cur.execute("UPDATE parametros.receta_nutricional SET url_imagen = %s WHERE codigo = %s;", (dest_url, cod))
        sync_conn.commit()
        cur.close()
        sync_conn.close()

    # 3. Escribir data/manifiesto_imagenes_recetas.md
    with open(args.manifiesto, 'w', encoding='utf-8') as mf:
        mf.write("# Manifiesto de Imágenes de Recetas Gastronómicas\n")
        mf.write(f"**Fecha de generación:** {fecha_hoy}  \n")
        mf.write(f"**Total procesadas en mapeo:** {len(mapeo_entries)}  \n")
        mf.write(f"**Ingestadas activas:** {agregadas + actualizadas + sin_cambio}  \n")
        mf.write(f"**Excluidas por duplicidad:** {excluidas}  \n")
        mf.write(f"**Mapeo utilizado:** `{args.mapeo}`  \n\n")
        mf.write("---\n\n")
        mf.write("| Código | Nombre Receta | Archivo Origen | Alias / Notas | SHA-256 | Estado | URL Imagen | Modelo Generador | Fecha |\n")
        mf.write("|:---:|---|---|---|---|:---:|---|---|:---:|\n")
        for row in sorted(manifiesto_rows, key=lambda x: x['codigo']):
            mf.write(f"| `{row['codigo']}` | {row['nombre']} | `{row['archivo_origen']}` | {row['alias']} | `{row['sha256']}` | **{row['estado']}** | `{row['url_imagen']}` | {row['modelo']} | {row['fecha']} |\n")

    print("\n================ RESUMEN DE INGESTA ================")
    print(f"Total procesadas: {len(mapeo_entries)}")
    print(f"Imágenes agregadas/copiadas: {agregadas}")
    print(f"Imágenes actualizadas: {actualizadas}")
    print(f"Imágenes sin cambio: {sin_cambio}")
    print(f"Archivos excluidos: {excluidas}")
    print(f"Total imágenes válidas asociadas: {agregadas + actualizadas + sin_cambio}")
    print(f"Manifiesto generado en: {args.manifiesto}")
    print("====================================================\n")

def main():
    parser = argparse.ArgumentParser(description="Ingesta validada e idempotente de imágenes de recetas")
    parser.add_argument("--origen", required=True, help="Directorio origen de las imágenes")
    parser.add_argument("--mapeo", required=True, help="Archivo CSV de mapeo (codigo,archivo)")
    parser.add_argument("--dest", default="frontend/public/recetas", help="Directorio destino")
    parser.add_argument("--manifiesto", default="data/manifiesto_imagenes_recetas.md", help="Ruta del manifiesto generado")
    default_db = os.getenv("DATABASE_URL", "postgresql://postgres:SpartanAdmin2026!@localhost:5433/spartan_db")
    if "+asyncpg" in default_db:
        default_db = default_db.replace("+asyncpg", "")
    parser.add_argument("--db-url", default=default_db, help="URL de base de datos")
    
    args = parser.parse_args()
    asyncio.run(run_ingestion(args))

if __name__ == "__main__":
    main()
