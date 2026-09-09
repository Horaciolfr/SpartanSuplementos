# Re-exportación canónica desde app.models para compatibilidad retroactiva total
from app.models import (
    Base,
    RolSistema, TipoDocumento, TipoOperacionKardex, CatalogoSomatotipo, CatalogoGenero,
    Usuario, Proveedor,
    CategoriaProducto, Producto,
    Compra, DetalleCompra, Venta, DetalleVenta,
    KardexFisico,
    VersionModeloIA, ReglaInferenciaCART, PerfilBiometrico, PrescripcionCrossSelling
)

__all__ = [
    "Base",
    "RolSistema", "TipoDocumento", "TipoOperacionKardex", "CatalogoSomatotipo", "CatalogoGenero",
    "Usuario", "Proveedor",
    "CategoriaProducto", "Producto",
    "Compra", "DetalleCompra", "Venta", "DetalleVenta",
    "KardexFisico",
    "VersionModeloIA", "ReglaInferenciaCART", "PerfilBiometrico", "PrescripcionCrossSelling"
]
