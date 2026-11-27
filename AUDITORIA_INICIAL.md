# Auditoría de reconstrucción — actualización v0.3.0

## Base recuperada
La antigua interfaz COMERCIANTE E-shopping se basaba en localStorage. Se toma como referencia funcional, no como núcleo contable fiable.

## Controles añadidos
- Doble partida con verificación Debe = Haber.
- Inventario por costo promedio ponderado.
- Separación de ventas a crédito y cobros posteriores.
- Medios no efectivos (transferencia/tarjeta) separados del efectivo físico.
- Pagos parciales de compras y gastos.
- Ajustes de inventario al editar existencias, registrados en el diario.
- IPV con ventas, cobros, crédito, costo, utilidad bruta, compras, gastos y arqueo.

## Casos verificados automáticamente
1. Compra pagada, venta en efectivo, gasto y cuadre: fondo 20 + venta 16 - compra pagada 15 - gasto 2 = 19.
2. Venta a crédito con cobro en fecha posterior sin duplicar venta.
3. Resultado neto negativo en escenario de gastos superiores al margen.
4. Faltante y sobrante en arqueo.
5. Bloqueo de venta superior al stock y de pago superior a deuda.
6. Transferencia no altera el efectivo físico.
7. Pago de proveedor y gasto pendiente.
8. Cierre IPV y valoración de inventario.
9. Cuentas por cobrar.
10. Ajuste manual de stock equilibrado contablemente.
11. Apertura de artículo con stock inicial.

Resultado: 16/16 pruebas automatizadas superadas.

## Limitaciones abiertas
No hay prueba física de cámara, impresión, Android o Windows. La interfaz está creada, pero no se pudo resolver npm (EAI_AGAIN al consultar registry.npmjs.org), por lo que falta instalar dependencias y generar build de producción. No afirmar todavía que existe APK o instalador terminado.
