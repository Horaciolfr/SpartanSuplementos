"""
Generador Oficial del Libro de Excel de Ventas y Stock para Spartan Suplementos Bolivia.
Actualizado según requerimientos específicos del usuario:
  - Total de transacciones: EXACTAMENTE 512 VENTAS.
  - Horario de atención comercial estricto: 9:00 AM a 8:00 PM (09:00 a 19:59).
  - Descuentos aleatorios: EXACTAMENTE 12 VENTAS con descuento (10% - 15% / monto en Bs.).
  - Ventas canceladas: EXACTAMENTE 4 VENTAS CANCELADAS (con alerta visual en rojo).
  - 4 Hojas estructuradas:
      1. Registro_de_Ventas (512 filas, N° Venta, Fecha, Hora 9am-8pm, SKU, Producto, Precio, Cantidad, Subtotal, Descuento, Total, Método Pago, Cliente, Estado)
      2. Inventario_y_Catalogo (30 SKUs, Precios, Costos, Márgenes, Stock Bodega, Alertas)
      3. Dashboard_Ejecutivo (KPIs: 512 ventas, 508 completadas, 4 canceladas, 12 con descuento, Facturación Neta, Métodos de Pago, Top Productos)
      4. Datos_Machine_Learning (Variables preparadas para el modelo Random Forest)
"""

import os
import random
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

import numpy as np
import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.generar_dataset_erp import obtener_catalogo_30_skus

OUTPUT_XLSX_DATA = PROJECT_ROOT / "data" / "ventas_spartan_suplementos_oficial.xlsx"
OUTPUT_XLSX_ROOT = PROJECT_ROOT.parent / "data" / "ventas_spartan_suplementos_oficial.xlsx"
OUTPUT_XLSX_TOP = PROJECT_ROOT.parent / "ventas_spartan_suplementos_oficial.xlsx"

CSV_OUTPUT_DATA = PROJECT_ROOT / "data" / "registro_ventas_spartan.csv"
CSV_OUTPUT_TOP = PROJECT_ROOT.parent / "data" / "registro_ventas_spartan.csv"

# Nombres bolivianos para clientes
NOMBRES = [
    "Carlos", "Rodrigo", "Alejandro", "Mateo", "Sebastián", "Diego", "Lucas", "Gabriel",
    "Javier", "Fernando", "Mauricio", "Álvaro", "Marcelo", "Jorge", "Andrés", "Gustavo",
    "Valeria", "Camila", "Luciana", "Mariana", "Natalia", "Andrea", "Daniela", "Sofía",
    "Paola", "Flavia", "Carolina", "Gabriela", "Renata", "Fernanda", "Isabella", "Adriana"
]
APELLIDOS = [
    "Mamani", "Flores", "Quispe", "Chávez", "Rojas", "Gutiérrez", "Vargas", "Condori",
    "Torrico", "Mendoza", "Morales", "Suárez", "Montaño", "Pinto", "Salazar", "Castillo",
    "Aguilar", "Baldivieso", "Camacho", "Villarroel", "Guzmán", "Paz", "Rivero", "Romero"
]


def generar_excel_512_ventas():
    print("Iniciando generación de libro Excel oficial con 512 ventas...")
    
    # Semilla para reproducibilidad estricta
    np.random.seed(42)
    random.seed(42)
    
    catalogo = obtener_catalogo_30_skus()
    skus_by_subcat = {}
    for p in catalogo:
        skus_by_subcat.setdefault(p["subcategoria"], []).append(p)
        
    pesos_subcat = {
        "Creatina Monohidratada": 0.28,
        "Whey Protein Concentrada": 0.22,
        "Quemador Termogénico": 0.15,
        "Whey Protein Isolatada": 0.13,
        "Mass Gainer": 0.12,
        "Camiseta Técnica": 0.05,
        "Short de Compresión": 0.05,
    }
    subcats = list(pesos_subcat.keys())
    probs_subcats = np.array([pesos_subcat[s] for s in subcats])
    probs_subcats = probs_subcats / probs_subcats.sum()
    
    # 500 clientes
    clientes_lista = []
    for cid in range(1, 501):
        nom = random.choice(NOMBRES)
        ap1 = random.choice(APELLIDOS)
        ap2 = random.choice(APELLIDOS)
        clientes_lista.append(f"{nom} {ap1} {ap2}")
        
    # Calendario 2025 para 512 transacciones
    fechas_2025 = [date(2025, 1, 2) + timedelta(days=i) for i in range(363)]
    # Ponderar fines de semana (+20%) y fines de mes
    weights_dias = [
        1.0 + 0.20 * (d.weekday() in (4, 5, 6)) + 0.20 * (d.day >= 28)
        for d in fechas_2025
    ]
    p_dias = np.array(weights_dias) / sum(weights_dias)
    fechas_asignadas = np.random.choice(fechas_2025, size=512, p=p_dias)
    fechas_asignadas.sort()  # Orden cronológico estricto
    
    # Horas estrictas: 9:00 am a 8:00 pm (09:00 a 19:59)
    # Generamos minutos realistas dentro de 9:00 y 19:55
    minutos_posibles = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
    
    # Métodos de pago comunes en Bolivia
    metodos_pago = ["Transferencia QR", "Efectivo", "Tarjeta de Débito", "Tarjeta de Crédito"]
    probs_pago = [0.48, 0.32, 0.15, 0.05]
    
    # Cantidades: 1 a 4 unidades
    probs_cant = [0.58, 0.27, 0.11, 0.04]
    
    # Selección aleatoria de exactamente 12 ventas con descuento
    idx_descuentos = set(np.random.choice(512, size=12, replace=False))
    
    # Selección aleatoria de exactamente 4 ventas canceladas (excluyendo las de descuento para claridad)
    indices_disponibles_canc = [i for i in range(512) if i not in idx_descuentos]
    idx_canceladas = set(np.random.choice(indices_disponibles_canc, size=4, replace=False))
    
    ventas_data = []
    for i in range(512):
        nro_venta = f"VTA-2025-{i + 1:04d}"
        fecha_obj = fechas_asignadas[i]
        
        # Hora estricta entre 09:00 y 19:55
        hora_h = np.random.randint(9, 20)  # 9 a 19 inclusive
        hora_m = np.random.choice(minutos_posibles)
        hora_str = f"{hora_h:02d}:{hora_m:02d}"
        
        subcat = np.random.choice(subcats, p=probs_subcats)
        prod = random.choice(skus_by_subcat[subcat])
        
        cant = int(np.random.choice([1, 2, 3, 4], p=probs_cant))
        precio_u = float(prod["precio_unitario"])
        subtotal = round(precio_u * cant, 2)
        
        # Descuento
        if i in idx_descuentos:
            # Descuento de 10% o monto promocional de 20 a 50 Bs.
            tipo_desc = random.choice(["10%", "15%", "monto"])
            if tipo_desc == "10%":
                descuento = round(subtotal * 0.10, 2)
            elif tipo_desc == "15%":
                descuento = round(subtotal * 0.15, 2)
            else:
                descuento = float(min(50.0, round(subtotal * 0.08, 0)))
                if descuento < 10.0:
                    descuento = 15.0
            descuento = min(descuento, subtotal - 10.0)
        else:
            descuento = 0.0
            
        # Estado de venta
        if i in idx_canceladas:
            estado = "Cancelada (Desistimiento)"
            total_venta = 0.0  # Venta cancelada no genera cobro neto
            metodo = "-"
        else:
            estado = "Completada"
            total_venta = round(subtotal - descuento, 2)
            metodo = np.random.choice(metodos_pago, p=probs_pago)
            
        cliente = random.choice(clientes_lista)
        
        ventas_data.append({
            "N° Venta": nro_venta,
            "Fecha": fecha_obj.strftime("%Y-%m-%d"),
            "Hora": hora_str,
            "Código SKU": prod["codigo_sku"],
            "Producto Vendido": prod["nombre_producto"],
            "Categoría": prod["categoria"],
            "Subcategoría": prod["subcategoria"],
            "Precio Unitario (Bs.)": precio_u,
            "Cantidad": cant,
            "Subtotal (Bs.)": subtotal,
            "Descuento (Bs.)": descuento,
            "Total Venta (Bs.)": total_venta,
            "Método de Pago": metodo,
            "Cliente": cliente,
            "Punto de Venta / Caja": "Caja 1 - Tienda Central",
            "Estado Transacción": estado,
        })
        
    df_ventas = pd.DataFrame(ventas_data)
    
    # --------------------------------------------------------------------------
    # Resumen de Inventario y Catálogo (30 SKUs)
    # --------------------------------------------------------------------------
    ventas_completadas = df_ventas[df_ventas["Estado Transacción"] == "Completada"]
    ventas_por_sku = ventas_completadas.groupby("Código SKU").agg(
        Vendidas=("Cantidad", "sum"),
        Facturado=("Total Venta (Bs.)", "sum"),
        Transacciones=("N° Venta", "count")
    ).to_dict("index")
    
    inv_data = []
    for p in catalogo:
        sku = p["codigo_sku"]
        stats_s = ventas_por_sku.get(sku, {"Vendidas": 0, "Facturado": 0.0, "Transacciones": 0})
        
        costo = float(p["costo_unitario"])
        precio = float(p["precio_unitario"])
        margen_bs = round(precio - costo, 2)
        margen_pct = round((margen_bs / precio), 3)
        
        vendidas = int(stats_s["Vendidas"])
        stock_seg = int(p["stock_seguridad"])
        stock_actual = max(3, int(p["stock_inicial"]) + 25 - (vendidas % 22))
        
        if stock_actual <= stock_seg:
            estado_st = "Stock Bajo (Reponer)"
        else:
            estado_st = "Óptimo"
            
        inv_data.append({
            "Código SKU": sku,
            "Nombre del Producto": p["nombre_producto"],
            "Categoría": p["categoria"],
            "Subcategoría": p["subcategoria"],
            "Costo Unitario (Bs.)": costo,
            "Precio Venta (Bs.)": precio,
            "Margen Bruto (Bs.)": margen_bs,
            "Margen (%)": margen_pct,
            "Stock Seguridad": stock_seg,
            "Stock Actual Bodega": stock_actual,
            "Unidades Vendidas": vendidas,
            "Total Facturado (Bs.)": float(stats_s["Facturado"]),
            "Estado de Stock": estado_st,
        })
    df_inventario = pd.DataFrame(inv_data)
    
    # --------------------------------------------------------------------------
    # Construcción del Libro Excel con openpyxl
    # --------------------------------------------------------------------------
    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # Quitar hoja default
    
    # Paleta de Estilos Ejecutivos
    FILL_NAVY = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    FILL_BLUE = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    FILL_SUBHEADER = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
    FILL_ZEBRA = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    FILL_WHITE = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    
    FILL_CANCELADA = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    FILL_DESCUENTO = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    FILL_STOCK_BAJO = PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid")
    
    FONT_HEADER = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    FONT_SUBHEADER = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    FONT_DATA = Font(name="Segoe UI", size=10, color="0F172A")
    FONT_TITLE = Font(name="Segoe UI", size=15, bold=True, color="0F172A")
    FONT_KPI_VAL = Font(name="Segoe UI", size=13, bold=True, color="1E3A8A")
    
    BORDER_THIN = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1")
    )
    
    # --------------------------------------------------------------------------
    # HOJA 1: REGISTRO DE VENTAS (512 VENTAS)
    # --------------------------------------------------------------------------
    ws_v = wb.create_sheet(title="Registro_de_Ventas")
    ws_v.views.sheetView[0].showGridLines = True
    ws_v.freeze_panes = "A2"
    
    headers_v = list(df_ventas.columns)
    for c_i, h in enumerate(headers_v, start=1):
        cell = ws_v.cell(row=1, column=c_i, value=h)
        cell.fill = FILL_NAVY
        cell.font = FONT_HEADER
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = BORDER_THIN
    ws_v.row_dimensions[1].height = 28
    
    for r_i, row in enumerate(df_ventas.itertuples(index=False), start=2):
        ws_v.row_dimensions[r_i].height = 20
        fill_row = FILL_ZEBRA if r_i % 2 == 1 else FILL_WHITE
        
        es_cancelada = "Cancelada" in str(row[headers_v.index("Estado Transacción")])
        tiene_descuento = float(row[headers_v.index("Descuento (Bs.)")]) > 0
        
        for c_i, val in enumerate(row, start=1):
            cell = ws_v.cell(row=r_i, column=c_i, value=val)
            cell.font = FONT_DATA
            cell.fill = fill_row
            cell.border = BORDER_THIN
            
            col_name = headers_v[c_i - 1]
            
            # Formatos de número
            if col_name in ["Precio Unitario (Bs.)", "Subtotal (Bs.)", "Descuento (Bs.)", "Total Venta (Bs.)"]:
                cell.number_format = '#,##0.00 "Bs."'
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif col_name == "Cantidad":
                cell.number_format = '#,##0'
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif col_name in ["N° Venta", "Fecha", "Hora", "Código SKU", "Punto de Venta / Caja"]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif col_name == "Estado Transacción":
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if es_cancelada:
                    cell.font = Font(name="Segoe UI", size=10, bold=True, color="991B1B")
                    cell.fill = FILL_CANCELADA
                else:
                    cell.font = Font(name="Segoe UI", size=10, color="065F46")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")
                
            # Resaltar ventas canceladas
            if es_cancelada and col_name in ["Total Venta (Bs.)", "N° Venta"]:
                cell.font = Font(name="Segoe UI", size=10, bold=True, color="991B1B")
                
            # Resaltar celda de descuento si hubo descuento
            if col_name == "Descuento (Bs.)" and tiene_descuento:
                cell.font = Font(name="Segoe UI", size=10, bold=True, color="B45309")
                cell.fill = FILL_DESCUENTO
                
    ws_v.auto_filter.ref = ws_v.dimensions
    
    # --------------------------------------------------------------------------
    # HOJA 2: INVENTARIO Y CATÁLOGO
    # --------------------------------------------------------------------------
    ws_i = wb.create_sheet(title="Inventario_y_Catalogo")
    ws_i.views.sheetView[0].showGridLines = True
    ws_i.freeze_panes = "A2"
    
    headers_i = list(df_inventario.columns)
    for c_i, h in enumerate(headers_i, start=1):
        cell = ws_i.cell(row=1, column=c_i, value=h)
        cell.fill = FILL_BLUE
        cell.font = FONT_HEADER
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = BORDER_THIN
    ws_i.row_dimensions[1].height = 28
    
    for r_i, row in enumerate(df_inventario.itertuples(index=False), start=2):
        ws_i.row_dimensions[r_i].height = 20
        fill_row = FILL_ZEBRA if r_i % 2 == 1 else FILL_WHITE
        
        for c_i, val in enumerate(row, start=1):
            cell = ws_i.cell(row=r_i, column=c_i, value=val)
            cell.font = FONT_DATA
            cell.fill = fill_row
            cell.border = BORDER_THIN
            
            col_name = headers_i[c_i - 1]
            if col_name in ["Costo Unitario (Bs.)", "Precio Venta (Bs.)", "Margen Bruto (Bs.)", "Total Facturado (Bs.)"]:
                cell.number_format = '#,##0.00 "Bs."'
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif col_name == "Margen (%)":
                cell.number_format = '0.0%'
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif col_name in ["Stock Seguridad", "Stock Actual Bodega", "Unidades Vendidas"]:
                cell.number_format = '#,##0'
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif col_name == "Código SKU":
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif col_name == "Estado de Stock":
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if "Bajo" in str(val):
                    cell.font = Font(name="Segoe UI", size=10, bold=True, color="92400E")
                    cell.fill = FILL_STOCK_BAJO
                else:
                    cell.font = Font(name="Segoe UI", size=10, color="065F46")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")
                
    ws_i.auto_filter.ref = ws_i.dimensions
    
    # --------------------------------------------------------------------------
    # HOJA 3: DASHBOARD RESUMEN EJECUTIVO
    # --------------------------------------------------------------------------
    ws_d = wb.create_sheet(title="Dashboard_Ejecutivo")
    ws_d.views.sheetView[0].showGridLines = True
    
    # Encabezado Principal
    ws_d["B2"] = "SPARTAN SUPLEMENTOS BOLIVIA"
    ws_d["B2"].font = FONT_TITLE
    ws_d["B3"] = "Informe Gerencial de Ventas e Inventario (Horario de Atención: 9:00 AM - 8:00 PM)"
    ws_d["B3"].font = Font(name="Segoe UI", size=11, italic=True, color="475569")
    
    # Cálculos KPIs
    total_tx = len(df_ventas)
    completadas = int((df_ventas["Estado Transacción"] == "Completada").sum())
    canceladas = int((df_ventas["Estado Transacción"] != "Completada").sum())
    con_desc = int((df_ventas["Descuento (Bs.)"] > 0).sum())
    
    total_facturacion = float(df_ventas["Total Venta (Bs.)"].sum())
    total_descuentos = float(df_ventas["Descuento (Bs.)"].sum())
    total_unidades = int(df_ventas[df_ventas["Estado Transacción"] == "Completada"]["Cantidad"].sum())
    ticket_promedio = round(total_facturacion / completadas, 2)
    
    kpis = [
        ("Total Ventas Registradas", f"{total_tx} registros"),
        ("Ventas Efectivas", f"{completadas} completadas"),
        ("Ventas Canceladas", f"{canceladas} canceladas"),
        ("Ventas con Descuento", f"{con_desc} operaciones"),
        ("Facturación Neta Total", f"{total_facturacion:,.2f} Bs."),
        ("Total Descuentos", f"{total_descuentos:,.2f} Bs."),
    ]
    
    col_start = 2
    for tit, val in kpis:
        c_t = ws_d.cell(row=5, column=col_start, value=tit)
        c_t.fill = FILL_SUBHEADER
        c_t.font = FONT_SUBHEADER
        c_t.alignment = Alignment(horizontal="center", vertical="center")
        c_t.border = BORDER_THIN
        
        c_v = ws_d.cell(row=6, column=col_start, value=val)
        c_v.fill = FILL_WHITE
        c_v.font = FONT_KPI_VAL
        c_v.alignment = Alignment(horizontal="center", vertical="center")
        c_v.border = BORDER_THIN
        
        ws_d.column_dimensions[get_column_letter(col_start)].width = 24
        col_start += 1
        
    ws_d.row_dimensions[5].height = 24
    ws_d.row_dimensions[6].height = 36
    
    # Tabla: Métodos de Pago
    ws_d["B9"] = "VENTAS POR MÉTODO DE PAGO"
    ws_d["B9"].font = Font(name="Segoe UI", size=12, bold=True, color="0F172A")
    
    pago_df = df_ventas[df_ventas["Estado Transacción"] == "Completada"].groupby("Método de Pago").agg(
        Operaciones=("N° Venta", "count"),
        Total_Bs=("Total Venta (Bs.)", "sum")
    ).reset_index()
    pago_df["% Participación"] = pago_df["Total_Bs"] / total_facturacion
    pago_df = pago_df.sort_values(by="Total_Bs", ascending=False)
    
    headers_pago = ["Método de Pago", "Operaciones", "Total Recaudado (Bs.)", "% Participación"]
    for c_i, h in enumerate(headers_pago, start=2):
        c = ws_d.cell(row=10, column=c_i, value=h)
        c.fill = FILL_NAVY
        c.font = FONT_HEADER
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = BORDER_THIN
        
    for r_i, r in enumerate(pago_df.itertuples(index=False), start=11):
        for c_i, v in enumerate(r, start=2):
            c = ws_d.cell(row=r_i, column=c_i, value=v)
            c.font = FONT_DATA
            c.border = BORDER_THIN
            if c_i == 3:
                c.number_format = '#,##0'
                c.alignment = Alignment(horizontal="center", vertical="center")
            elif c_i == 4:
                c.number_format = '#,##0.00 "Bs."'
                c.alignment = Alignment(horizontal="right", vertical="center")
            elif c_i == 5:
                c.number_format = '0.0%'
                c.alignment = Alignment(horizontal="right", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")
                
    # Tabla: Ventas por Categoría
    ws_d["B17"] = "RESUMEN POR CATEGORÍA"
    ws_d["B17"].font = Font(name="Segoe UI", size=12, bold=True, color="0F172A")
    
    cat_df = df_ventas[df_ventas["Estado Transacción"] == "Completada"].groupby("Categoría").agg(
        Operaciones=("N° Venta", "count"),
        Unidades=("Cantidad", "sum"),
        Total_Bs=("Total Venta (Bs.)", "sum")
    ).reset_index()
    cat_df["% Facturación"] = cat_df["Total_Bs"] / total_facturacion
    
    headers_cat = ["Categoría", "Operaciones", "Unidades Vendidas", "Total Facturado (Bs.)", "% Facturación"]
    for c_i, h in enumerate(headers_cat, start=2):
        c = ws_d.cell(row=18, column=c_i, value=h)
        c.fill = FILL_BLUE
        c.font = FONT_HEADER
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = BORDER_THIN
        
    for r_i, r in enumerate(cat_df.itertuples(index=False), start=19):
        for c_i, v in enumerate(r, start=2):
            c = ws_d.cell(row=r_i, column=c_i, value=v)
            c.font = FONT_DATA
            c.border = BORDER_THIN
            if c_i in [3, 4]:
                c.number_format = '#,##0'
                c.alignment = Alignment(horizontal="center", vertical="center")
            elif c_i == 5:
                c.number_format = '#,##0.00 "Bs."'
                c.alignment = Alignment(horizontal="right", vertical="center")
            elif c_i == 6:
                c.number_format = '0.0%'
                c.alignment = Alignment(horizontal="right", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")
                
    # --------------------------------------------------------------------------
    # HOJA 4: DATOS PARA MACHINE LEARNING (Preprocesados)
    # --------------------------------------------------------------------------
    ws_ml = wb.create_sheet(title="Datos_Machine_Learning")
    ws_ml.views.sheetView[0].showGridLines = True
    ws_ml.freeze_panes = "A2"
    
    # Preparar dataset analítico para estas 512 ventas
    ml_rows = []
    for r in ventas_data:
        ml_rows.append({
            "id_transaccion": r["N° Venta"],
            "fecha": r["Fecha"],
            "codigo_sku": r["Código SKU"],
            "nombre_producto": r["Producto Vendido"],
            "categoria": r["Categoría"],
            "subcategoria": r["Subcategoría"],
            "precio_unitario": r["Precio Unitario (Bs.)"],
            "cantidad": r["Cantidad"],
            "total_bs": r["Total Venta (Bs.)"],
            "descuento_bs": r["Descuento (Bs.)"],
            "metodo_pago": r["Método de Pago"],
            "estado": r["Estado Transacción"],
        })
    df_ml = pd.DataFrame(ml_rows)
    
    headers_ml = list(df_ml.columns)
    for c_i, h in enumerate(headers_ml, start=1):
        cell = ws_ml.cell(row=1, column=c_i, value=h)
        cell.fill = FILL_SUBHEADER
        cell.font = FONT_HEADER
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = BORDER_THIN
    ws_ml.row_dimensions[1].height = 26
    
    for r_i, row in enumerate(df_ml.itertuples(index=False), start=2):
        fill_row = FILL_ZEBRA if r_i % 2 == 1 else FILL_WHITE
        for c_i, v in enumerate(row, start=1):
            cell = ws_ml.cell(row=r_i, column=c_i, value=v)
            cell.font = Font(name="Segoe UI", size=9)
            cell.fill = fill_row
            cell.border = BORDER_THIN
            if isinstance(v, (int, np.integer)):
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif isinstance(v, (float, np.floating)):
                cell.alignment = Alignment(horizontal="right", vertical="center")
                cell.number_format = '#,##0.00'
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")
    ws_ml.auto_filter.ref = ws_ml.dimensions
    
    # --------------------------------------------------------------------------
    # Auto-ajuste de anchos de columnas
    # --------------------------------------------------------------------------
    for ws in [ws_v, ws_i, ws_ml]:
        for col in ws.columns:
            max_len = 0
            for cell in col[:150]:
                val_str = str(cell.value or "")
                if len(val_str) > max_len:
                    max_len = len(val_str)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 13)
            
    # Guardar Excel en las rutas con manejo de archivos bloqueados por Excel
    guardado_ok = []
    for target in [OUTPUT_XLSX_DATA, OUTPUT_XLSX_ROOT, OUTPUT_XLSX_TOP]:
        os.makedirs(target.parent, exist_ok=True)
        try:
            wb.save(target)
            print(f"Excel guardado en: {target}")
            guardado_ok.append(target)
        except PermissionError:
            print(f"Aviso: {target} está abierto en Excel. Guardando versión alternativa...")
            alt_target = target.parent / "ventas_spartan_512_actualizado.xlsx"
            wb.save(alt_target)
            print(f"Excel guardado como: {alt_target}")
        
    # Guardar CSV de ventas
    for c_target in [CSV_OUTPUT_DATA, CSV_OUTPUT_TOP]:
        os.makedirs(c_target.parent, exist_ok=True)
        try:
            df_ventas.to_csv(c_target, index=False, encoding="utf-8")
            print(f"CSV de ventas guardado en: {c_target}")
        except PermissionError:
            alt_csv = c_target.parent / "registro_ventas_512.csv"
            df_ventas.to_csv(alt_csv, index=False, encoding="utf-8")
            print(f"CSV guardado como: {alt_csv}")
        
    print(f"\nResumen de Validación:")
    print(f"  • Total transacciones generadas: {len(df_ventas)}")
    print(f"  • Ventas con descuento:          {con_desc} (esperadas: 12)")
    print(f"  • Ventas canceladas:             {canceladas} (esperadas: 4)")
    print(f"  • Ventas completadas:            {completadas} (esperadas: 508)")
    print(f"  • Rango de horas:                {df_ventas['Hora'].min()} a {df_ventas['Hora'].max()} (estricto 9am - 8pm)")


if __name__ == "__main__":
    generar_excel_512_ventas()
