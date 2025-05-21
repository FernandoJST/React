// server/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const pool = require('../conexion');

router.get('/', verifyToken, async (req, res) => {
    try {
        // 1. Estadísticas
        const [ventasDiaResult] = await pool.query("SELECT COALESCE(SUM(total), 0) AS total_ventas_dia FROM ventas WHERE DATE(fecha) = CURDATE()");
        const totalVentasDia = ventasDiaResult[0].total_ventas_dia || 0;

        const [productosVendidosResult] = await pool.query(`
            SELECT COALESCE(SUM(dv.cantidad), 0) AS total_productos_vendidos
            FROM detalle_ventas dv
            JOIN ventas v ON dv.id_venta = v.id_venta
            WHERE DATE(v.fecha) = CURDATE()
        `);
        const totalProductosVendidos = productosVendidosResult[0].total_productos_vendidos || 0;

        const [clientesAtendidosResult] = await pool.query(`
            SELECT COUNT(DISTINCT id_cliente) AS total_clientes_atendidos
            FROM ventas
            WHERE DATE(fecha) = CURDATE()
        `);
        const totalClientesAtendidos = clientesAtendidosResult[0].total_clientes_atendidos || 0;

        const [productosBajoStockCountResult] = await pool.query("SELECT COUNT(*) AS productos_por_agotarse_count FROM productos WHERE stock <= 10");
        const productosPorAgotarseCount = productosBajoStockCountResult[0].productos_por_agotarse_count || 0;

        const stats = {
            total_ventas_dia: parseFloat(totalVentasDia),
            total_productos_vendidos: parseInt(totalProductosVendidos),
            total_clientes_atendidos: parseInt(totalClientesAtendidos),
            productos_por_agotarse_count: parseInt(productosPorAgotarseCount)
        };

        // 2. Productos bajos en stock
        const [lowStockProducts] = await pool.query("SELECT id_producto, nombre, stock FROM productos WHERE stock <= 10 ORDER BY stock ASC LIMIT 10");

        // 3. Actividades recientes
        const [recentSalesActivities] = await pool.query(`
            SELECT id_venta AS id, 'sale' AS type, CONCAT('Venta #', id_venta, ' a Cliente ', COALESCE((SELECT nombre FROM clientes WHERE id_cliente = v.id_cliente), 'Desconocido')) AS description, fecha AS time
            FROM ventas v
            ORDER BY fecha DESC
            LIMIT 5
        `);

        const [recentClientActivities] = await pool.query(`
            SELECT id_cliente AS id, 'client' AS type, CONCAT('Nuevo cliente registrado: ', nombre) AS description, fecha_registro AS time
            FROM clientes
            ORDER BY fecha_registro DESC
            LIMIT 5
        `);

        const recentActivities = [...recentSalesActivities, ...recentClientActivities]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10);

        res.json({
            success: true,
            stats: stats,
            low_stock_products: lowStockProducts,
            recent_activities: recentActivities
        });

    } catch (error) {
        console.error('Database Error in /api/dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar datos del dashboard.',
            error: error.message
        });
    }
});

module.exports = router;