import os
import sys
import subprocess
import tempfile
import csv
import shutil
import pytest

DB_URL = "postgresql://postgres:SpartanAdmin2026!@localhost:5433/spartan_db"

def test_ingesta_violacion_r1_codigo_inexistente():
    """R1: Archivo con código inexistente debe fallar con salida no cero sin mutar base."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        fake_img = os.path.join(tmp_dir, "Plato inventado [MESO·GM].jfif")
        with open(fake_img, "wb") as f:
            f.write(b"\xFF\xD8\xFF\xE0" + b"0" * 100) # dummy jfif
        
        csv_path = os.path.join(tmp_dir, "map_invalid.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["codigo", "archivo"])
            writer.writerow(["REC-999", "Plato inventado [MESO·GM].jfif"])
        
        # Ejecutar script
        cmd = [
            sys.executable,
            "scripts/ingestar_imagenes_recetas.py",
            "--origen", tmp_dir,
            "--mapeo", csv_path,
            "--dest", os.path.join(tmp_dir, "dest"),
            "--manifiesto", os.path.join(tmp_dir, "manifiesto.md")
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        assert res.returncode != 0
        assert "ERROR R1 FATAL" in res.stderr

def test_ingesta_violacion_r2_tag_contradictorio():
    """R2: Archivo con tag contradictorio al almacenado en DB debe fallar con salida no cero."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        # REC-010 en DB es MESO·GM, pero el archivo dice ENDO·PP
        fake_img = os.path.join(tmp_dir, "Plato con tag incorrecto [ENDO·PP].jfif")
        with open(fake_img, "wb") as f:
            f.write(b"\xFF\xD8\xFF\xE0" + b"0" * 100)
        
        csv_path = os.path.join(tmp_dir, "map_mismatch.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["codigo", "archivo"])
            writer.writerow(["REC-010", "Plato con tag incorrecto [ENDO·PP].jfif"])
        
        cmd = [
            sys.executable,
            "scripts/ingestar_imagenes_recetas.py",
            "--origen", tmp_dir,
            "--mapeo", csv_path,
            "--dest", os.path.join(tmp_dir, "dest"),
            "--manifiesto", os.path.join(tmp_dir, "manifiesto.md")
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        assert res.returncode != 0
        assert "ERROR R2 FATAL" in res.stderr

@pytest.mark.asyncio
async def test_ingesta_duplicado_excluido_no_copia():
    """Verifica que el archivo duplicado de REC-022 no se copia en frontend/public/recetas."""
    dest_file = "frontend/public/recetas/filete de res magra con papa al horno y ensalada [MESO·GM].jpg"
    assert not os.path.exists(dest_file)
    
    # En la base de datos REC-022 tiene la imagen del bistec, no del filete
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.catalogs import RecetaNutricional
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(RecetaNutricional.url_imagen).where(RecetaNutricional.codigo == 'REC-022')
        )
        url = result.scalar_one_or_none()
        assert url == "/recetas/REC-022.jpg"

