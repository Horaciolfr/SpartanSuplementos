"""
Generador Oficial del Libro de Excel de Ventas y Stock para Spartan Suplementos Bolivia
SUCURSAL SANTA CRUZ (Equipetrol / 2do Anillo).

Especificaciones:
  - Volumen: 885 transacciones (dentro del rango solicitado de 860 a 915 datos).
  - Sucursal: Sucursal Santa Cruz (Equipetrol).
  - Horario de atención comercial: 9:00 AM a 8:00 PM (09:00 a 19:55).
  - Descuentos: 18 ventas aleatorias con descuento promocional (10% - 15%).
  - Cancelaciones: 7 ventas canceladas (0.00 Bs. neto, con alerta visual roja).
  - Clientes con nombres y apellidos representativos de la región cruceña y Bolivia.
  - 4 Hojas estructuradas:
      1. Registro_de_Ventas (885 filas, N° Venta VTA-SCZ-..., Fecha, Hora, SKU, Producto, Subtotal, Descuento, Total, Método Pago, Cliente, Sucursal, Estado)
      2. Inventario_y_Catalogo (30 SKUs, Stock en Bodega SCZ, Unidades Vendidas, Facturación, Alertas)
      3. Dashboard_Ejecutivo (KPIs Santa Cruz: Facturación Total, Unidades, Completadas, Canceladas, Descuentos, Métodos de Pago, Categorías)
      4. Datos_Machine_Learning (Variables analíticas listas para modelos predictivos)
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

OUTPUT_XLSX_DATA = PROJECT_ROOT / "data" / "ventas_spartan_santa_cruz.xlsx"
OUTPUT_XLSX_ROOT = PROJECT_ROOT.parent / "data" / "ventas_spartan_santa_cruz.xlsx"
OUTPUT_XLSX_TOP = PROJECT_ROOT.parent / "ventas_spartan_santa_cruz.xlsx"

CSV_OUTPUT_DATA = PROJECT_ROOT / "data" / "registro_ventas_santa_cruz.csv"
CSV_OUTPUT_TOP = PROJECT_ROOT.parent / "data" / "registro_ventas_santa_cruz.csv"
CSV_OUTPUT_ROOT = PROJECT_ROOT.parent / "registro_ventas_santa_cruz.csv"

# Nombres y apellidos cruceños y bolivianos
NOMBRES_SCZ = [
    "Carlos", "Rodrigo", "Alejandro", "Mateo", "Sebastián", "Diego", "Lucas", "Gabriel",
    "Javier", "Fernando", "Mauricio", "Álvaro", "Marcelo", "Jorge", "Andrés", "Gustavo",
    "Bruno", "Joaquín", "Leonardo", "Fabrizio", "Ignacio", "Nicolás", "Esteban", "Hugo",
    "Valeria", "Camila", "Luciana", "Mariana", "Natalia", "Andrea", "Daniela", "Sofía",
    "Paola", "Flavia", "Carolina", "Gabriela", "Renata", "Fernanda", "Isabella", "Adriana",
    "Fabiana", "Juliana", "Micaela", "Constanza", "Nicole", "Victoria", "Raquel", "Vanessa"
]

APELLIDOS_SCZ = [
    "Justiniano", "Aguilera", "Melgar", "Barba", "Ribera", "Saucedo", "Landívar", "Parada",
    "Antelo", "Roca", "Vaca", "Añez", "Cuéllar", "Rivero", "Montero", "Salvatierra",
    "Dorado", "Soliz", "Chávez", "Suárez", "Pinto", "Gutiérrez", "Mendoza", "Castillo",
    "Montaño", "Rojas", "Torrico", "Morales", "Paz", "Romero", "Camacho", "Villarroel"
]


def generar_excel_santa_cruz(n_ventas: int = 885):
    print(f"Generando dataset y libro Excel para SUCURSAL SANTA CRUZ con {n_ventas} transacciones...")
    
    # Semilla para reproducibilidad estricta
    np.random.seed(105)
    random.seed(105)
    
    catalogo = obtener_catalogo_30_skus()
    skus_by_subcat = {}
    for p in catalogo:
        skus_by_subcat.setdefault(p["subcategoria"], []).append(p)
        
    # Ponderaciones de demanda adaptadas a Santa Cruz:
    # Alta cultura fitness tropical: mayor demanda de Whey Isolatada, Quemadores y Ropa deportiva ligera
    pesos_subcat_scz = {
        "Creatina Monohidratada": 0.25,
        "Whey Protein Concentrada": 0.20,
        "Whey Protein Isolatada": 0.17,
        "Quemador Termogénico": 0.16,
        "Mass Gainer": 0.10,
        "Short de Compresión": 0.06,
        "Camiseta Técnica": 0.06,
    }
    subcats = list(pesos_subcat_scz.keys())
    probs_subcats = np.array([pesos_subcat_scz[s] for s in subcats])
    probs_subcats = probs_subcats / probs_subcats.sum()
    
    # 500 clientes registrados en la base de datos de Santa Cruz
    clientes_scz = []
    for _ in range(500):
        nom = random.choice(NOMBRES_SCZ)
        ap1 = random.choice(APELLIDOS_SCZ)
        ap2 = random.choice(APELLIDOS_SCZ)
        clientes_scz.append(f"{nom} {ap1} {ap2}")
        
    # Calendario anual 2025 distribuido a lo largo de los 365 días
    fechas_2025 = [date(2025, 1, 2) + timedelta(days=i) for i in range(363)]
    weights_dias = [
        1.0 + 0.25 * (d.weekday() in (4, 5, 6)) + 0.20 * (d.day >= 28)
        for d in fechas_2025
    ]
    p_dias = np.array(weights_dias) / sum(weights_dias)
    fechas_asignadas = np.random.choice(fechas_2025, size=n_ventas, p=p_dias)
    fechas_asignadas.sort()  # Orden cronológico
    
    # Horario comercial estricto: 9:00 AM a 8:00 PM (09:00 a 19:55)
    minutos_posibles = [0, 5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 55]
    
    # Métodos de pago en Santa Cruz (alta adopción de QR y tarjetas)
    metodos_pago_scz = ["Transferencia QR", "Tarjeta de Débito", "Efectivo", "Tarjeta de Crédito"]
    probs_pago_scz = [0.52, 0.22, 0.20, 0.06]
    
    probs_cant = [0.60, 0.26, 0.10, 0.04]
    
    # Exactamente 18 ventas con descuento
    idx_descuentos = set(np.random.choice(n_ventas, size=18, replace=False))
    
    # Exactamente 7 ventas canceladas
    disponibles_canc = [i for i in range(n_ventas) if i not in idx_descuentos]
    idx_canceladas = set(np.random.choice(disponibles_canc, size=7, replace=False))
    
    cajas_scz = ["Caja 1 - SCZ Equipetrol", "Caja 2 - SCZ Equipetrol"]
    
    ventas_scz_data = []
    for i in range(n_ventas):
        nro_venta = f"VTA-SCZ-2025-{i + 1:04d}"
        fecha_obj = fechas_asignadas[i]
        
        # Horas dentro de 09:00 y 19:55
        hora_h = np.random.randint(9, 20)
        hora_m = np.random.choice(minutos_posibles)
        hora_str = f"{hora_h:02d}:{hora_m:02d}"
        
        subcat = np.random.choice(subcats, p=probs_subcats)
        prod = random.choice(skus_by_subcat[subcat])
        
        cant = int(np.random.choice([1, 2, 3, 4], p=probs_cant))
        precio_u = float(prod["precio_unitario"])
        subtotal = round(precio_u * cant, 2)
        
        # Descuentos
        if i in idx_descuentos:
            tipo_desc = random.choice(["10%", "15%", "fijo"])
            if tipo_desc == "10%":
                descuento = round(subtotal * 0.10, 2)
            elif tipo_desc == "15%":
                descuento = round(subtotal * 0.15, 2)
            else:
                descuento = float(min(60.0, round(subtotal * 0.08, 0)))
                if descuento < 15.0:
                    descuento = 20.0
            descuento = min(descuento, subtotal - 10.0)
        else:
            descuento = 0.0
            
        # Cancelaciones
        if i in idx_canceladas:
            estado = "Cancelada (Desistimiento)"
            total_venta = 0.0
            metodo = "-"
        else:
            estado = "Completada"
            total_venta = round(subtotal - descuento, 2)
            metodo = np.random.choice(metodos_pago_scz, p=probs_pago_scz)
            
        cliente = random.choice(clientes_scz)
        caja = random.choice(cajas_scz)
        
        ventas_scz_data.append({
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
            "Sucursal": "Sucursal Santa Cruz (Equipetrol)",
            "Punto de Venta / Caja": caja,
            "Estado Transacción": estado,
        })
        
    df_ventas = pd.DataFrame(ventas_scz_data)
    
    # --------------------------------------------------------------------------
    # Resumen de Inventario para Sucursal Santa Cruz (30 SKUs)
    # --------------------------------------------------------------------------
    ventas_completadas = df_ventas[df_ventas["Estado Transacción"] == "Completada"]
    ventas_sku = ventas_completadas.groupby("Código SKU").agg(
        Vendidas=("Cantidad", "sum"),
        Facturado=("Total Venta (Bs.)", "sum"),
        Operaciones=("N° Venta", "count")
    ).to_dict("index")
    
    inv_data = []
    for p in catalogo:
        sku = p["codigo_sku"]
        stats_s = ventas_sku.get(sku, {"Vendidas": 0, "Facturado": 0.0, "Operaciones": 0})
        
        costo = float(p["costo_unitario"])
        precio = float(p["precio_unitario"])
        margen_bs = round(precio - costo, 2)
        margen_pct = round((margen_bs / precio), 3)
        
        vendidas = int(stats_s["Vendidas"])
        stock_seg = int(p["stock_seguridad"])
        # Stock adaptado al volumen de Santa Cruz
        stock_actual = max(4, int(p["stock_inicial"]) + 35 - (vendidas % 28))
        
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
            "Stock Actual Bodega SCZ": stock_actual,
            "Unidades Vendidas": vendidas,
            "Total Facturado (Bs.)": float(stats_s["Facturado"]),
            "Estado de Stock": estado_st,
        })
    df_inventario = pd.DataFrame(inv_data)
    
    # --------------------------------------------------------------------------
    # Construcción de Workbook con openpyxl
    # --------------------------------------------------------------------------
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    
    # Estilos Corporativos Spartan Santa Cruz (Navy & Emerald Green Accent)
    FILL_HEADER_NAVY = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    FILL_HEADER_EMERALD = PatternFill(start_color="065F46", end_color="065F46", fill_type="solid")
    FILL_SUBHEADER = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    FILL_ZEBRA = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    FILL_WHITE = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    
    FILL_CANCELADA = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    FILL_DESCUENTO = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    FILL_STOCK_BAJO = PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid")
    
    FONT_HEADER = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    FONT_SUBHEADER = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    FONT_DATA = Font(name="Segoe UI", size=10, color="0F172A")
    FONT_TITLE = Font(name="Segoe UI", size=15, bold=True, color="0F172A")
    FONT_KPI_VAL = Font(name="Segoe UI", size=13, bold=True, color="065F46")
    
    BORDER_THIN = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1")
    )
    
    # --------------------------------------------------------------------------
    # HOJA 1: REGISTRO DE VENTAS (SANTA CRUZ)
    # --------------------------------------------------------------------------
    ws_v = wb.create_sheet(title="Registro_de_Ventas")
    ws_v.views.sheetView[0].showGridLines = True
    ws_v.freeze_panes = "A2"
    
    headers_v = list(df_ventas.columns)
    for c_i, h in enumerate(headers_v, start=1):
        cell = ws_v.cell(row=1, column=c_i, value=h)
        cell.fill = FILL_HEADER_NAVY
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
            
            if col_name in ["Precio Unitario (Bs.)", "Subtotal (Bs.)", "Descuento (Bs.)", "Total Venta (Bs.)"]:
                cell.number_format = '#,##0.00 "Bs."'
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif col_name == "Cantidad":
                cell.number_format = '#,##0'
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif col_name in ["N° Venta", "Fecha", "Hora", "Código SKU", "Punto de Venta / Caja", "Sucursal"]:
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
                
            if es_cancelada and col_name in ["Total Venta (Bs.)", "N° Venta"]:
                cell.font = Font(name="Segoe UI", size=10, bold=True, color="991B1B")
                
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
        cell.fill = FILL_HEADER_EMERALD
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
            elif col_name in ["Stock Seguridad", "Stock Actual Bodega SCZ", "Unidades Vendidas"]:
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
    # HOJA 3: DASHBOARD RESUMEN EJECUTIVO (SANTA CRUZ)
    # --------------------------------------------------------------------------
    ws_d = wb.create_sheet(title="Dashboard_Ejecutivo")
    ws_d.views.sheetView[0].showGridLines = True
    
    ws_d["B2"] = "SPARTAN SUPLEMENTOS BOLIVIA — SUCURSAL SANTA CRUZ"
    ws_d["B2"].font = FONT_TITLE
    ws_d["B3"] = "Informe Gerencial de Operaciones e Inventario — Equipetrol (Horario: 9:00 AM - 8:00 PM)"
    ws_d["B3"].font = Font(name="Segoe UI", size=11, italic=True, color="475569")
    
    total_tx = len(df_ventas)
    completadas = int((df_ventas["Estado Transacción"] == "Completada").sum())
    canceladas = int((df_ventas["Estado Transacción"] != "Completada").sum())
    con_desc = int((df_ventas["Descuento (Bs.)"] > 0).sum())
    
    total_facturacion = float(df_ventas["Total Venta (Bs.)"].sum())
    total_descuentos = float(df_ventas["Descuento (Bs.)"].sum())
    total_unidades = int(df_ventas[df_ventas["Estado Transacción"] == "Completada"]["Cantidad"].sum())
    ticket_promedio = round(total_facturacion / completadas, 2)
    
    kpis = [
        ("Ventas Totales Registradas", f"{total_tx} registros"),
        ("Ventas Efectivas", f"{completadas} completadas"),
        ("Ventas Canceladas", f"{canceladas} canceladas"),
        ("Ventas con Descuento", f"{con_desc} operaciones"),
        ("Facturación Neta Total", f"{total_facturacion:,.2f} Bs."),
        ("Total Descuentos Otorgados", f"{total_descuentos:,.2f} Bs."),
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
        
        ws_d.column_dimensions[get_column_letter(col_start)].width = 25
        col_start += 1
        
    ws_d.row_dimensions[5].height = 24
    ws_d.row_dimensions[6].height = 36
    
    # Tabla Métodos de Pago
    ws_d["B9"] = "MÉTODOS DE PAGO EN SANTA CRUZ"
    ws_d["B9"].font = Font(name="Segoe UI", size=12, bold=True, color="0F172A")
    
    pago_df = df_ventas[df_ventas["Estado Transacción"] == "Completada"].groupby("Método de Pago").agg(
        Operaciones=("N° Venta", "count"),
        Total_Bs=("Total Venta (Bs.)", "sum")
    ).reset_index()
    pago_df["% Participación"] = pago_df["Total_Bs"] / total_facturacion
    pago_df = pago_df.sort_values(by="Total_Bs", ascending=False)
    
    headers_pago = ["Método de Pago", "Operaciones", "Total Cobrado (Bs.)", "% Participación"]
    for c_i, h in enumerate(headers_pago, start=2):
        c = ws_d.cell(row=10, column=c_i, value=h)
        c.fill = FILL_HEADER_NAVY
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
                
    # Tabla Ventas por Categoría
    ws_d["B17"] = "VENTAS POR CATEGORÍA EN SANTA CRUZ"
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
        c.fill = FILL_HEADER_EMERALD
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
    # HOJA 4: DATOS PARA MACHINE LEARNING
    # --------------------------------------------------------------------------
    ws_ml = wb.create_sheet(title="Datos_Machine_Learning")
    ws_ml.views.sheetView[0].showGridLines = True
    ws_ml.freeze_panes = "A2"
    
    ml_rows = []
    for r in ventas_scz_data:
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
            "sucursal": r["Sucursal"],
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
    # Auto-ajuste de anchos de columna
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
            
    # Guardar Excel en las rutas
    for target in [OUTPUT_XLSX_DATA, OUTPUT_XLSX_ROOT, OUTPUT_XLSX_TOP]:
        os.makedirs(target.parent, exist_ok=True)
        try:
            wb.save(target)
            print(f"Excel de Santa Cruz guardado en: {target}")
        except PermissionError:
            print(f"Aviso: {target} ocupado. Guardando copia alternativa...")
            alt = target.parent / "ventas_spartan_santa_cruz_nuevo.xlsx"
            wb.save(alt)
            print(f"Guardado como: {alt}")
            
    # Guardar CSV de ventas Santa Cruz
    for c_target in [CSV_OUTPUT_DATA, CSV_OUTPUT_TOP, CSV_OUTPUT_ROOT]:
        os.makedirs(c_target.parent, exist_ok=True)
        try:
            df_ventas.to_csv(c_target, index=False, encoding="utf-8")
            print(f"CSV de Santa Cruz guardado en: {c_target}")
        except PermissionError:
            pass
            
    print(f"\nResumen Sucursal Santa Cruz:")
    print(f"  • Total transacciones: {len(df_ventas)} (en rango [860, 915])")
    print(f"  • Ventas efectivas:    {completadas}")
    print(f"  • Ventas canceladas:   {canceladas}")
    print(f"  • Ventas con descuento: {con_desc}")
    print(f"  • Facturación Neta:    {total_facturacion:,.2f} Bs.")
    print(f"  • Rango de horarios:   {df_ventas['Hora'].min()} a {df_ventas['Hora'].max()} (estricto 9am - 8pm)")


if __name__ == "__main__":
    generar_excel_santa_cruz(885)
