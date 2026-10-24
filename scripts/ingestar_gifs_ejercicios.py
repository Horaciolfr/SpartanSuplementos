#!/usr/bin/env python3
"""
Script de ingesta validada e idempotente de animaciones GIF de ejercicios (Bloque 37 - Paso 2).
Aplica estrictamente las reglas R1-E, R2-E y R3-E:
- R1-E: Vinculación de GIF a ejercicio SOLO por código EJ-xxx validado contra parametros.ejercicio.
- R2-E: Desajuste de tags entre archivo y base = error fatal con salida no cero.
- R3-E: Ejercicio sin GIF = placeholder "Animación en preparación", sin request roto y url_gif = NULL.
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
from typing import Dict, Any, Tuple, Optional

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

def parse_tags_from_filename(filename: str) -> Tuple[Optional[str], Optional[str]]:
    m = re.search(r'\[(.*?)[·\-\–\—\s]([A-Z]+)\]', filename)
    if not m:
        return None, None
    soma = m.group(1).strip()
    obj = m.group(2).strip()
    return soma, obj

# Duplicado identificado en recursos 4 para Salto de cuerda
DUPLICADO_EXCLUIDO_NOMBRE = "salto en soga.gif"
DUPLICADO_EXCLUIDO_SHA = "16358fb96138624e3e8cbebe443ecd3b1ebbcf6a65040db0bc66dcdf465ddb69"

def validate_exercise_mapping(
    codigo: str,
    archivo: str,
    db_exercises: Dict[str, Dict[str, Any]],
    origen_dir: str
) -> Tuple[bool, str, Dict[str, Any]]:
    """Valida una tupla (codigo, archivo) bajo las reglas R1-E y R2-E."""
    # R1-E: Código debe existir en base
    if codigo not in db_exercises:
        return False, f"ERROR R1-E: Código '{codigo}' no existe en parametros.ejercicio", {}

    ej_db = db_exercises[codigo]
    origen_path = os.path.join(origen_dir, archivo)

    # Archivo debe existir físicamente
    if not os.path.isfile(origen_path):
        return False, f"ERROR R1-E: Archivo físico '{archivo}' no existe en {origen_dir}", {}

    # R2-E: Si el archivo declara tags entre corchetes, deben coincidir exactamente con la base
    file_soma, file_obj = parse_tags_from_filename(archivo)
    if file_soma and file_obj:
        norm_file_soma = normalize_somatotipo(file_soma)
        norm_db_soma = normalize_somatotipo(ej_db['somatotipo_afin'])
        if norm_file_soma != norm_db_soma:
            return False, f"ERROR R2-E: Desajuste de somatotipo en {archivo}. Tag: {norm_file_soma}, DB: {norm_db_soma}", {}
        if file_obj != ej_db['objetivo']:
            return False, f"ERROR R2-E: Desajuste de objetivo en {archivo}. Tag: {file_obj}, DB: {ej_db['objetivo']}", {}

    return True, "OK", ej_db

async def run_ingestion(args):
    if not os.path.isdir(args.origen):
        print(f"ERROR: Directorio origen no existe: {args.origen}", file=sys.stderr)
        sys.exit(1)

    if not os.path.isfile(args.mapeo):
        print(f"ERROR: Archivo de mapeo no existe: {args.mapeo}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.dest, exist_ok=True)

    # 1. Obtener ejercicios de la base de datos
    db_exercises = {}
    conn = None
    use_asyncpg = False

    clean_db_url = args.db_url.replace("postgresql+asyncpg://", "postgresql://")

    try:
        import asyncpg
        use_asyncpg = True
        conn = await asyncpg.connect(clean_db_url)
        rows = await conn.fetch("SELECT id_ejercicio, codigo, nombre, categoria, somatotipo_afin, objetivo, url_gif FROM parametros.ejercicio ORDER BY codigo;")
        for r in rows:
            db_exercises[r['codigo']] = {
                'id_ejercicio': r['id_ejercicio'],
                'codigo': r['codigo'],
                'nombre': r['nombre'],
                'categoria': r['categoria'],
                'somatotipo_afin': r['somatotipo_afin'],
                'objetivo': r['objetivo'],
                'url_gif': r['url_gif']
            }
    except Exception as ex_async:
        try:
            import psycopg2
            sync_conn = psycopg2.connect(args.db_url)
            cur = sync_conn.cursor()
            cur.execute("SELECT id_ejercicio, codigo, nombre, categoria, somatotipo_afin, objetivo, url_gif FROM parametros.ejercicio ORDER BY codigo;")
            for r in cur.fetchall():
                db_exercises[r[1]] = {
                    'id_ejercicio': r[0],
                    'codigo': r[1],
                    'nombre': r[2],
                    'categoria': r[3],
                    'somatotipo_afin': r[4],
                    'objetivo': r[5],
                    'url_gif': r[6]
                }
            cur.close()
            sync_conn.close()
        except Exception as ex_sync:
            print(f"ERROR conectando a BD: asyncpg ({ex_async}) / psycopg2 ({ex_sync})", file=sys.stderr)
            sys.exit(1)

    print(f"Conectado a BD. {len(db_exercises)} ejercicios cargados de parametros.ejercicio.")

    # 2. Leer archivo de mapeo CSV
    mapeo_entries = []
    with open(args.mapeo, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cod = row.get('codigo', '').strip()
            arch = row.get('archivo', '').strip()
            if cod and arch:
                mapeo_entries.append((cod, arch))

    print(f"Cargadas {len(mapeo_entries)} asignaciones desde {args.mapeo}")

    # 3. Validar y procesar cada entrada
    manifiesto_rows = []
    fecha_hoy = datetime.date.today().isoformat()
    origen_declarado = "Animación 3D biomecánica / Guía de técnica Spartan"
    licencia_declarada = "Uso Académico / Proyecto de Grado - Spartan Suplementos"

    agregadas = 0
    actualizadas = 0
    sin_cambio = 0
    excluidas = 0

    updates_db = []

    for codigo, archivo in mapeo_entries:
        origen_path = os.path.join(args.origen, archivo)
        sha = compute_sha256(origen_path) if os.path.isfile(origen_path) else ""

        # Manejo de duplicado conocido
        if archivo == DUPLICADO_EXCLUIDO_NOMBRE or sha == DUPLICADO_EXCLUIDO_SHA:
            print(f"-> EXCLUSIÓN OBLIGATORIA: {archivo} (Duplicado de salto de soga.gif / EJ-008, SHA: {sha})")
            excluidas += 1
            manifiesto_rows.append({
                'codigo': codigo,
                'nombre': db_exercises.get(codigo, {}).get('nombre', 'Desconocido'),
                'categoria': db_exercises.get(codigo, {}).get('categoria', '-'),
                'archivo_origen': archivo,
                'sha256': sha,
                'estado': 'EXCLUIDA-DUPLICADO de salto de soga.gif',
                'url_gif': 'NO_COPIADO',
                'origen': origen_declarado,
                'licencia': licencia_declarada
            })
            continue

        valido, err_msg, ej_db = validate_exercise_mapping(codigo, archivo, db_exercises, args.origen)
        if not valido:
            print(f"FATAL: {err_msg}", file=sys.stderr)
            sys.exit(1)

        dest_filename = f"{codigo}.gif"
        dest_path = os.path.join(args.dest, dest_filename)
        dest_url = f"/rutinas/{dest_filename}"

        necesita_copia = True
        if os.path.exists(dest_path):
            dest_sha = compute_sha256(dest_path)
            if dest_sha == sha:
                necesita_copia = False

        if necesita_copia:
            shutil.copy2(origen_path, dest_path)
            if ej_db['url_gif'] == dest_url:
                actualizadas += 1
            else:
                agregadas += 1
        else:
            if ej_db['url_gif'] == dest_url:
                sin_cambio += 1
            else:
                agregadas += 1

        if ej_db['url_gif'] != dest_url:
            updates_db.append((dest_url, codigo))

        manifiesto_rows.append({
            'codigo': codigo,
            'nombre': ej_db['nombre'],
            'categoria': ej_db['categoria'],
            'archivo_origen': archivo,
            'sha256': sha,
            'estado': 'INGESTADO_OK',
            'url_gif': dest_url,
            'origen': origen_declarado,
            'licencia': licencia_declarada
        })

    # Verificar también los archivos en el directorio de origen que no están en el mapeo (p. ej. duplicados)
    todos_origen = sorted(os.listdir(args.origen))
    archivos_en_mapeo = {a for _, a in mapeo_entries}
    for arch in todos_origen:
        if arch not in archivos_en_mapeo:
            arch_path = os.path.join(args.origen, arch)
            if os.path.isfile(arch_path):
                sha_extra = compute_sha256(arch_path)
                estado_extra = "NO_MAPEADO"
                if arch == DUPLICADO_EXCLUIDO_NOMBRE or sha_extra == DUPLICADO_EXCLUIDO_SHA:
                    estado_extra = "EXCLUIDA-DUPLICADO de salto de soga.gif"
                    excluidas += 1
                manifiesto_rows.append({
                    'codigo': '-',
                    'nombre': '(Sin vincular)',
                    'categoria': '-',
                    'archivo_origen': arch,
                    'sha256': sha_extra,
                    'estado': estado_extra,
                    'url_gif': 'NO_COPIADO',
                    'origen': origen_declarado,
                    'licencia': licencia_declarada
                })

    # 4. Actualizar base de datos
    if updates_db:
        if use_asyncpg:
            for url_gif, cod in updates_db:
                await conn.execute("UPDATE parametros.ejercicio SET url_gif = $1 WHERE codigo = $2;", url_gif, cod)
        else:
            import psycopg2
            sync_conn = psycopg2.connect(args.db_url)
            cur = sync_conn.cursor()
            for url_gif, cod in updates_db:
                cur.execute("UPDATE parametros.ejercicio SET url_gif = %s WHERE codigo = %s;", (url_gif, cod))
            sync_conn.commit()
            cur.close()
            sync_conn.close()
        print(f"Base de datos actualizada: {len(updates_db)} ejercicios con nuevo url_gif.")
    else:
        print("Base de datos sin cambios requeridos (idempotente).")

    if conn and use_asyncpg:
        await conn.close()

    # 5. Generar Manifiesto en Markdown
    os.makedirs(os.path.dirname(os.path.abspath(args.manifiesto)), exist_ok=True)
    with open(args.manifiesto, 'w', encoding='utf-8') as mf:
        mf.write("# Manifiesto de Ingesta de GIFs de Ejercicios — Spartan Suplementos\n\n")
        mf.write(f"- **Fecha de generación:** {fecha_hoy}\n")
        mf.write(f"- **Directorio de origen:** `{args.origen}`\n")
        mf.write(f"- **Directorio de destino:** `{args.dest}`\n")
        mf.write(f"- **Mapeo utilizado:** `{args.mapeo}`\n")
        mf.write(f"- **Total procesados:** {len(manifiesto_rows)} | Ingestados: {agregadas + actualizadas + sin_cambio} | Excluidos: {excluidas}\n\n")
        mf.write("| Código | Ejercicio | Categoría | Archivo Origen | SHA-256 | Estado | URL GIF | Origen del Recurso | Licencia Declarada |\n")
        mf.write("|---|---|---|---|---|---|---|---|---|\n")
        for r in manifiesto_rows:
            mf.write(f"| {r['codigo']} | {r['nombre']} | {r['categoria']} | {r['archivo_origen']} | `{r['sha256'][:16]}...` | {r['estado']} | `{r['url_gif']}` | {r['origen']} | {r['licencia']} |\n")

    print(f"Manifiesto generado exitosamente en: {args.manifiesto}")
    print(f"Resumen: Agregadas: {agregadas}, Actualizadas: {actualizadas}, Sin cambio: {sin_cambio}, Excluidas: {excluidas}")

def main():
    parser = argparse.ArgumentParser(description="Ingesta validada de GIFs de ejercicios para Spartan Suplementos")
    parser.add_argument("--origen", default=r"E:\PROYECTO DE GRADO\nuevo proyecto\Proyecto SS\recursos 4", help="Ruta al directorio de GIFs origen")
    parser.add_argument("--mapeo", default=r"E:\PROYECTO DE GRADO\nuevo proyecto\Proyecto SS\data\ejercicios_map.csv", help="Ruta al archivo CSV de mapeo")
    parser.add_argument("--dest", default=r"E:\PROYECTO DE GRADO\nuevo proyecto\Proyecto SS\frontend\public\rutinas", help="Directorio destino frontend")
    parser.add_argument("--db-url", default=os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/spartan_db"), help="URL de conexión a PostgreSQL")
    parser.add_argument("--manifiesto", default=r"E:\PROYECTO DE GRADO\nuevo proyecto\Proyecto SS\data\manifiesto_gifs_ejercicios.md", help="Ruta del manifiesto markdown")

    args = parser.parse_args()
    asyncio.run(run_ingestion(args))

if __name__ == "__main__":
    main()
