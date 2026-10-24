import os
import sys
import subprocess
import tempfile
import csv
import pytest

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:SpartanAdmin2026!@localhost:5433/spartan_db")

def test_ingesta_violacion_r1_codigo_inexistente():
    """R1-E: Archivo con código inexistente debe fallar con salida no cero sin mutar base."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        fake_gif = os.path.join(tmp_dir, "ejercicio_inventado.gif")
        with open(fake_gif, "wb") as f:
            f.write(b"GIF89a" + b"0" * 100)
        
        csv_path = os.path.join(tmp_dir, "map_invalid.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["codigo", "archivo"])
            writer.writerow(["EJ-999", "ejercicio_inventado.gif"])
        
        dest_dir = os.path.join(tmp_dir, "dest")
        cmd = [
            sys.executable,
            "scripts/ingestar_gifs_ejercicios.py",
            "--origen", tmp_dir,
            "--mapeo", csv_path,
            "--dest", dest_dir,
            "--db-url", DB_URL,
            "--manifiesto", os.path.join(tmp_dir, "manifiesto.md")
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        assert res.returncode != 0
        assert "ERROR R1-E" in res.stderr
        assert not os.path.exists(os.path.join(dest_dir, "EJ-999.gif"))

def test_ingesta_violacion_r2_tag_contradictorio():
    """R2-E: Archivo con tag contradictorio al almacenado en DB debe fallar con salida no cero."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        # EJ-001 en DB es MESO·GM, pero el archivo declara [ENDO·PP]
        fake_gif = os.path.join(tmp_dir, "sentadilla [ENDO·PP].gif")
        with open(fake_gif, "wb") as f:
            f.write(b"GIF89a" + b"0" * 100)
        
        csv_path = os.path.join(tmp_dir, "map_mismatch.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["codigo", "archivo"])
            writer.writerow(["EJ-001", "sentadilla [ENDO·PP].gif"])
        
        dest_dir = os.path.join(tmp_dir, "dest")
        cmd = [
            sys.executable,
            "scripts/ingestar_gifs_ejercicios.py",
            "--origen", tmp_dir,
            "--mapeo", csv_path,
            "--dest", dest_dir,
            "--db-url", DB_URL,
            "--manifiesto", os.path.join(tmp_dir, "manifiesto.md")
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        assert res.returncode != 0
        assert "ERROR R2-E" in res.stderr
        assert not os.path.exists(os.path.join(dest_dir, "EJ-001.gif"))

def test_ingesta_violacion_archivo_inexistente():
    """R1-E: Archivo físico inexistente en directorio origen debe fallar con salida no cero."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        csv_path = os.path.join(tmp_dir, "map_missing.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["codigo", "archivo"])
            writer.writerow(["EJ-001", "no_existe_archivo.gif"])
        
        cmd = [
            sys.executable,
            "scripts/ingestar_gifs_ejercicios.py",
            "--origen", tmp_dir,
            "--mapeo", csv_path,
            "--dest", os.path.join(tmp_dir, "dest"),
            "--db-url", DB_URL,
            "--manifiesto", os.path.join(tmp_dir, "manifiesto.md")
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        assert res.returncode != 0
        assert "ERROR R1-E" in res.stderr

@pytest.mark.asyncio
async def test_ingesta_duplicado_excluido_no_copia():
    """Verifica que el archivo duplicado de salto en soga no se copia y EJ-008 tiene su URL correcta."""
    assert not os.path.exists("frontend/public/rutinas/salto en soga.gif")
    
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.catalogs import Ejercicio
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Ejercicio.url_gif).where(Ejercicio.codigo == 'EJ-008')
        )
        url = result.scalar_one_or_none()
        assert url == "/rutinas/EJ-008.gif"
