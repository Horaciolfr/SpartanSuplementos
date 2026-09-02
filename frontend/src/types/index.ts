export interface User {
  id_usuario: number;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  rol: string;
}

export interface Categoria {
  id_categoria: number;
  nombre_categoria: string;
  created_at?: string;
}

export interface Producto {
  id_producto: number;
  id_categoria: number;
  codigo_sku: string;
  nombre_producto: string;
  precio_unitario: number;
  stock_actual: number;
  stock_seguridad: number;
  estado_activo: boolean;
  categoria?: Categoria;
}

export interface VentaItemRequest {
  id_producto: number;
  cantidad: number;
}

export interface VentaCreateRequest {
  id_cliente?: number | null;
  items: VentaItemRequest[];
}

export interface DetalleVentaOut {
  id_detalle_venta: number;
  id_producto: number;
  codigo_sku: string;
  nombre_producto: string;
  cantidad: number;
  precio_historico: number;
  subtotal: number;
}

export interface VentaResponse {
  id_venta: number;
  numero_recibo: string;
  total_transaccion: number;
  estado_pago: string;
  fecha_hora_venta: string;
  cajero: string;
  cliente?: string | null;
  detalles: DetalleVentaOut[];
}

export interface KardexMovimiento {
  id_kardex: number;
  id_producto: number;
  tipo_operacion: string;
  cantidad_movimiento: number;
  saldo_resultante: number;
  id_venta?: number | null;
  id_compra?: number | null;
  fecha_registro: string;
}
