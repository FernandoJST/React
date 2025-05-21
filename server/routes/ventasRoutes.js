// server/routes/ventasRoutes.js
const express = require('express');
const router = express.Router();
// Importa el middleware de verificaci\u00f3n de token
const verifyToken = require('../middleware/authMiddleware');
// Assuming 'pool' is your database connection pool exported from conexion.js
const pool = require('../conexion'); // <--- Usamos pool desde conexion.js

// Importar funciones de validaci\u00f3n y resultado de validaci\u00f3n
const { body, query, validationResult } = require('express-validator');

// --- Helper Function to handle DB Errors ---
// Una funci\u00f3n de ayuda para manejar errores comunes de DB y enviar respuestas estandarizadas
const handleDBError = (res, error, context) => {
    console.error(`Database Error in ${context}:`, error);
    // Check for specific constraint violations (like foreign keys)
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1452 || error.errno === 1451) {
        return res.status(409).json({ success: false, message: 'Error de datos: Cliente, vendedor o producto no válido(s) o referenciado(s) en otra parte del sistema.' });
    }
    // Check for duplicate entry errors
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        return res.status(409).json({ success: false, message: 'Error de datos: Entrada duplicada.' }); // Ajusta el mensaje si aplica a un campo espec\u00edfico
    }
    // Check for custom stock insufficient error messages thrown in the code
    if (error.message.includes('Stock insuficiente')) {
        return res.status(409).json({ success: false, message: error.message }); // Devuelve el mensaje espec\u00edfico de stock
    }

    // Generic database error
    if (!res.headersSent) { // Prevent sending multiple responses
        return res.status(500).json({ success: false, message: `Error de base de datos en ${context}.`, error: error.message });
    }
};


// --- Rutas GET - Protegidas por verifyToken ---
// Todas las acciones GET se manejar\u00e1n en este endpoint \u00fanico usando el par\u00e1metro 'action'
router.get('/', verifyToken, async (req, res) => {
    const action = req.query.action; // Leer el par\u00e1metro 'action'

    try {
        switch (action) {
            case 'listar': // Listar ventas con paginaci\u00f3n y b\u00fasqueda
                // Validaci\u00f3n espec\u00edfica para 'listar'
                await query('page').optional().isInt({ min: 1 }).toInt().default(1).run(req);
                await query('limit').optional().isInt({ min: 1 }).toInt().default(10).run(req);
                await query('search').optional().isString().trim().run(req); // Validaci\u00f3n para b\u00fasqueda


                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({ success: false, message: 'Par\u00e1metros de paginaci\u00f3n/b\u00fasqueda inv\u00e1lidos.', errors: errors.array() });
                }

                // Acceder a los valores validados y convertidos por express-validator
                const page = req.query.page; // Deber\u00eda ser integer por .toInt()
                const limit = req.query.limit; // Deber\u00e1 ser integer por .toInt()
                const search = req.query.search || ''; // Usar default si est\u00e1 vac\u00edo o no proporcionado

                // Protecci\u00f3n extra: Asegurarse de que sean n\u00fameros v\u00e1lidos justo antes de usar
                const safePage = parseInt(page, 10);
                const safeLimit = parseInt(limit, 10);

                // Si por alguna raz\u00f3n (a pesar de la validaci\u00f3n) no son n\u00fameros v\u00e1lidos, usar defaults o reportar error
                if (isNaN(safePage) || safePage < 1 || isNaN(safeLimit) || safeLimit < 1) {
                    console.error(`Error en par\u00e1metros de paginaci\u00f3n a pesar de validaci\u00f3n: page=${page}, limit=${limit}`);
                    // Fallback a valores por defecto o reportar un error 500 si es inesperado
                    const fallbackPage = 1;
                    const fallbackLimit = 10;
                    const offset = (fallbackPage - 1) * fallbackLimit;

                    let countSql = `SELECT COUNT(*) AS total FROM ventas v
JOIN clientes c ON v.id_cliente = c.id_cliente
JOIN usuarios u ON v.id_usuario = u.id_usuario`; // Espacios iniciales eliminados
                    let dataSql = `SELECT v.id_venta, v.fecha, v.total, c.nombre AS cliente_nombre, u.nombre_usuario AS vendedor_nombre
FROM ventas v
JOIN clientes c ON v.id_cliente = c.id_cliente
JOIN usuarios u ON v.id_usuario = u.id_usuario`; // Espacios iniciales eliminados
                    const queryParams = [];

                    if (search) {
                        const searchTerm = `%${search}%`;
                        dataSql += " WHERE c.nombre LIKE ? OR v.fecha LIKE ?";
                        countSql += " WHERE c.nombre LIKE ? OR v.fecha LIKE ?";
                        queryParams.push(searchTerm, searchTerm);
                    }

                    dataSql += " ORDER BY v.fecha DESC, v.id_venta DESC LIMIT ? OFFSET ?";
                    queryParams.push(fallbackLimit, offset);

                    const countParams = search ? [queryParams[0], queryParams[1]] : [];

                    const [countRows] = await pool.query(countSql, countParams);
                    const totalVentas = countRows[0].total;
                    const [ventas] = await pool.query(dataSql, queryParams);

                    // Reportar que hubo un problema, pero devolver datos por defecto
                    return res.status(200).json({ success: true, data: ventas, total: totalVentas, message: 'Warning: Invalid pagination params received, showing default page 1.' });

                }

                // Si los par\u00e1metros son v\u00e1lidos (o se convirtieron correctamente)
                const offset = (safePage - 1) * safeLimit;

                // --- Lógica de base de datos para listar ventas ---
                let countSql = `SELECT COUNT(*) AS total FROM ventas v
JOIN clientes c ON v.id_cliente = c.id_cliente
JOIN usuarios u ON v.id_usuario = u.id_usuario`; // Espacios iniciales eliminados
                let dataSql = `SELECT v.id_venta, v.fecha, v.total, c.nombre AS cliente_nombre, u.nombre_usuario AS vendedor_nombre
FROM ventas v
JOIN clientes c ON v.id_cliente = c.id_cliente
JOIN usuarios u ON v.id_usuario = u.id_usuario`; // Espacios iniciales eliminados
                const queryParams = [];

                // Añadir filtro de búsqueda si existe
                if (search) {
                    const searchTerm = `%${search}%`;
                    dataSql += " WHERE c.nombre LIKE ? OR v.fecha LIKE ?";
                    countSql += " WHERE c.nombre LIKE ? OR v.fecha LIKE ?";
                    queryParams.push(searchTerm, searchTerm);
                }

                dataSql += " ORDER BY v.fecha DESC, v.id_venta DESC LIMIT ? OFFSET ?";
                // Usar los valores seguros y parseados
                queryParams.push(safeLimit, offset);

                // Usar pool.query aqu\u00ed ya que no es una transacci\u00f3n
                const countParams = search ? [queryParams[0], queryParams[1]] : [];

                const [countRows] = await pool.query(countSql, countParams);
                const totalVentas = countRows[0].total;

                const [ventas] = await pool.query(dataSql, queryParams);

                res.json({ success: true, data: ventas, total: totalVentas, message: 'Ventas listadas con éxito.' });

                break;

            case 'obtener': // Obtener datos principales de una venta por ID (espera id en query params)
                await query('id').isInt({ min: 1 }).withMessage('ID de venta inválido o no proporcionado.').run(req);

                const errorsObtener = validationResult(req);
                if (!errorsObtener.isEmpty()) {
                    return res.status(400).json({ success: false, message: errorsObtener.array()[0].msg });
                }

                const id = req.query.id; // Obtener ID de query params

                // Usar pool.query
                const [rows] = await pool.query(`
SELECT v.id_venta, v.id_cliente, v.id_usuario, v.fecha, v.total, c.nombre AS cliente_nombre, u.nombre_usuario AS vendedor_nombre
FROM ventas v
JOIN clientes c ON v.id_cliente = c.id_cliente
JOIN usuarios u ON v.id_usuario = u.id_usuario
 WHERE v.id_venta = ?
 `, [id]);

                const venta = rows[0];

                if (!venta) {
                    return res.status(404).json({ success: false, message: 'Venta no encontrada.' });
                }
                // Asegurar tipos para consistencia con el frontend
                venta.id_venta = parseInt(venta.id_venta);
                venta.id_cliente = parseInt(venta.id_cliente);
                venta.id_usuario = parseInt(venta.id_usuario);
                venta.total = parseFloat(venta.total);


                res.json(venta); // Devolver el objeto venta directamente como espera el frontend

                break;

            case 'obtener_detalles': // Obtener detalles de productos de una venta por ID de venta (espera id_venta en query params)
                await query('id_venta').isInt({ min: 1 }).withMessage('ID de venta inválido o no proporcionado para detalles.').run(req);

                const errorsDetalles = validationResult(req);
                if (!errorsDetalles.isEmpty()) {
                    return res.status(400).json({ success: false, message: errorsDetalles.array()[0].msg });
                }

                const id_venta_detalles = req.query.id_venta; // Obtener ID de query params

                // Usar pool.query
                const [detalles] = await pool.query(`
SELECT dv.id_detalle, dv.id_venta, dv.id_producto, dv.cantidad, dv.precio_unitario, dv.subtotal, p.nombre AS nombre_producto
FROM detalle_ventas dv
JOIN productos p ON dv.id_producto = p.id_producto
 WHERE dv.id_venta = ?
`, [id_venta_detalles]);

                // Asegurar tipos para consistencia con el frontend
                const detallesFormateados = detalles.map(detalle => ({
                    ...detalle,
                    id_detalle: parseInt(detalle.id_detalle),
                    id_venta: parseInt(detalle.id_venta),
                    id_producto: parseInt(detalle.id_producto),
                    cantidad: parseInt(detalle.cantidad),
                    precio_unitario: parseFloat(detalle.precio_unitario),
                    subtotal: parseFloat(detalle.subtotal),
                }));


                res.json(detallesFormateados); // Devolver el array de detalles directamente

                break;

            case 'get_modal_data': // Obtener datos para los selectores del modal de venta
                // No necesita validaci\u00f3n de query params espec\u00edfica aqu\u00ed
                // Usar pool.query
                const [clients] = await pool.query("SELECT id_cliente, nombre FROM clientes ORDER BY nombre ASC");
                // Asume que los vendedores est\u00e1n en la tabla usuarios y quiz\u00e1s tienen un rol espec\u00edfico
                // Si necesitas filtrar por rol: SELECT id_usuario, nombre_usuario FROM usuarios WHERE rol = 'vendedor' ORDER BY nombre_usuario ASC
                const [sellers] = await pool.query("SELECT id_usuario, nombre_usuario FROM usuarios ORDER BY nombre_usuario ASC"); // Ejemplo: todos los usuarios
                // Obtener productos disponibles para venta (stock > 0, o alg\u00fan otro criterio)
                const [products] = await pool.query("SELECT id_producto, nombre, precio, stock FROM productos WHERE stock > 0 ORDER BY nombre ASC"); // Ejemplo: productos con stock > 0

                res.json({ success: true, clients, sellers, products, message: "Datos para el modal de venta cargados con éxito." });
                break;

            default:
                // Acci\u00f3n GET no v\u00e1lida o no especificada
                res.status(400).json({ success: false, message: 'Acción GET no válida o no especificada para ventas.' });
                break;
        }
    } catch (error) {
        // Manejo general de errores para rutas GET (incluyendo errores de validaci\u00f3n si no se manejan en el switch)
        // handleDBError ya maneja si la respuesta ya fue enviada
        handleDBError(res, error, 'rutaGETVentas');
    }
});


// --- Ruta POST para agregar, actualizar o eliminar ventas - Protegida por verifyToken ---
// Todas las acciones POST se manejar\u00e1n en este endpoint \u00fanico usando el par\u00e1metro 'action' en el BODY
router.post('/', verifyToken, async (req, res) => {
    const action = req.body.action; // Leer el par\u00e1metro 'action' del body

    let connection; // Declarar conexi\u00f3n aqu\u00ed para poder liberarla en finally
    try {
        connection = await pool.getConnection(); // Obtener conexi\u00f3n del pool para la transacci\u00f3n
        await connection.beginTransaction(); // Iniciar la transacci\u00f3n

        switch (action) {
            case 'agregar': // Agregar nueva venta
                // Validaci\u00f3n espec\u00edfica para 'agregar' usando express-validator en el body
                await body('id_cliente').isInt({ min: 1 }).withMessage('Cliente inválido.').run(req);
                await body('id_usuario').isInt({ min: 1 }).withMessage('Vendedor inválido.').run(req);
                await body('fecha').isISO8601().toDate().withMessage('Formato de fecha inválido (YYYY-MM-DD).').run(req);
                await body('productos').isArray({ min: 1 }).withMessage('La lista de productos no puede estar vacía.').run(req);
                // Validaci\u00f3n para cada item dentro del array de productos
                await body('productos.*.id_producto').isInt({ min: 1 }).withMessage('ID de producto inválido en la lista de productos.').run(req);
                await body('productos.*.cantidad').isInt({ min: 1 }).withMessage('Cantidad inválida en la lista de productos.').run(req);
                await body('productos.*.precio_unitario').isFloat({ min: 0 }).withMessage('Precio unitario inválido en la lista de productos.').run(req);

                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    // Consolidar mensajes de error para enviar al frontend
                    const messages = errors.array().map(err => err.msg).join(' ');
                    await connection.rollback(); // Rollback si la validaci\u00f3n falla
                    return res.status(400).json({ success: false, message: `Datos de venta inválidos: ${messages}` });
                }

                const { id_cliente, id_usuario, fecha, productos } = req.body;
                // Recalcular total en backend para seguridad/precisi\u00f3n
                const totalCalculado = productos.reduce((sum, item) => {
                    return sum + (parseInt(item.cantidad, 10) * parseFloat(item.precio_unitario));
                }, 0);


                // --- L\u00f3gica de Base de Datos: Agregar Venta (dentro de transacci\u00f3n) ---

                // 1. Insertar en tabla 'ventas'
                const [ventaResult] = await connection.execute(
                    "INSERT INTO ventas (id_cliente, id_usuario, fecha, total) VALUES (?, ?, ?, ?)",
                    [id_cliente, id_usuario, fecha, totalCalculado]
                );
                const id_venta = ventaResult.insertId;

                if (!id_venta) {
                    throw new Error("Error al obtener el ID de la nueva venta.");
                }

                // 2. Iterar sobre 'productos', insertar en 'detalle_ventas' y actualizar stock
                const sqlDetalleInsert = "INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)";
                const sqlStockSubtract = "UPDATE productos SET stock = stock - ? WHERE id_producto = ? AND stock >= ?"; // Resta y verifica stock m\u00ednimo


                for (const item of productos) {
                    const id_producto = parseInt(item.id_producto, 10);
                    const cantidad = parseInt(item.cantidad, 10);
                    const precio_unitario = parseFloat(item.precio_unitario);
                    const subtotal = cantidad * precio_unitario; // Recalcular subtotal en el backend para precisi\u00f3n

                    // 2a. Verificar stock DISPONIBLE antes de restar (¡CR\u00cdTICO dentro de transacci\u00f3n!)
                    const [[product]] = await connection.execute("SELECT stock FROM productos WHERE id_producto = ?", [id_producto]);

                    if (!product) {
                        throw new Error(`Producto con ID ${id_producto} no encontrado.`); // Esto activar\u00e1 el catch y rollback
                    }
                    if (product.stock < cantidad) {
                        throw new Error(`Stock insuficiente para el producto ID ${id_producto}. Stock actual: ${product.stock}, Cantidad solicitada: ${cantidad}`); // Esto activar\u00e1 el catch y rollback
                    }

                    // 2b. Restar stock
                    const [stockUpdateResult] = await connection.execute(sqlStockSubtract, [cantidad, id_producto, cantidad]);
                    if (stockUpdateResult.affectedRows === 0) {
                        // Esto puede ocurrir si el stock es 0 o menos despu\u00e9s del SELECT
                        throw new Error(`No se pudo actualizar el stock para el producto ID ${id_producto}. Posiblemente stock insuficiente.`);
                    }

                    // 2c. Insertar detalle
                    await connection.execute(sqlDetalleInsert, [id_venta, id_producto, cantidad, precio_unitario, subtotal]);
                }

                // Si todo fue exitoso, hacer commit
                await connection.commit();
                res.status(201).json({ success: true, message: 'Venta registrada exitosamente.', id_venta: id_venta }); // 201 Created


                break;

            case 'actualizar': // Actualizar venta existente (espera id_venta en body)
                // Validaci\u00f3n espec\u00edfica para 'actualizar'
                await body('id_venta').isInt({ min: 1 }).withMessage('ID de venta inválido o no proporcionado para actualizar.').run(req);
                await body('id_cliente').isInt({ min: 1 }).withMessage('Cliente inválido.').run(req);
                await body('id_usuario').isInt({ min: 1 }).withMessage('Vendedor inválido.').run(req);
                await body('fecha').isISO8601().toDate().withMessage('Formato de fecha inválido (YYYY-MM-DD).').run(req);
                await body('productos').isArray({ min: 1 }).withMessage('La lista de productos no puede estar vacía.').run(req);
                await body('productos.*.id_producto').isInt({ min: 1 }).withMessage('ID de producto inválido en la lista de productos.').run(req);
                await body('productos.*.cantidad').isInt({ min: 1 }).withMessage('Cantidad inválida en la lista de productos.').run(req);
                await body('productos.*.precio_unitario').isFloat({ min: 0 }).withMessage('Precio unitario inválido en la lista de productos.').run(req);


                const errorsActualizar = validationResult(req);
                if (!errorsActualizar.isEmpty()) {
                    const messages = errorsActualizar.array().map(err => err.msg).join(' ');
                    await connection.rollback();
                    return res.status(400).json({ success: false, message: `Datos de venta inválidos para actualizar: ${messages}` });
                }

                const { id_venta: updIdVenta, id_cliente: updIdCliente, id_usuario: updIdUsuario, fecha: updFecha, productos: updProductos } = req.body;
                const totalCalculadoActualizar = updProductos.reduce((sum, item) => {
                    return sum + (parseInt(item.cantidad, 10) * parseFloat(item.precio_unitario));
                }, 0);


                // --- L\u00f3gica de Base de Datos: Actualizar Venta (dentro de transacci\u00f3n) ---

                // 1. Obtener detalles de productos actuales para revertir stock
                const [currentDetails] = await connection.execute("SELECT id_producto, cantidad FROM detalle_ventas WHERE id_venta = ?", [updIdVenta]);

                // 2. Revertir stock para los items actuales
                const sqlStockAdd = "UPDATE productos SET stock = stock + ? WHERE id_producto = ?";
                for (const item of currentDetails) {
                    await connection.execute(sqlStockAdd, [parseInt(item.cantidad, 10), parseInt(item.id_producto, 10)]);
                }

                // 3. Eliminar detalles antiguos de detalle_ventas
                await connection.execute("DELETE FROM detalle_ventas WHERE id_venta = ?", [updIdVenta]);

                // 4. Actualizar la fila principal en 'ventas'
                const [updateVentaResult] = await connection.execute(
                    "UPDATE ventas SET id_cliente=?, id_usuario=?, fecha=?, total=? WHERE id_venta=?",
                    [updIdCliente, updIdUsuario, updFecha, totalCalculadoActualizar, updIdVenta]
                );

                // Opcional: Verificar si la venta principal exist\u00eda antes de intentar actualizar
                if (updateVentaResult.affectedRows === 0) {
                    const [checkExists] = await connection.execute("SELECT COUNT(*) AS count FROM ventas WHERE id_venta = ?", [updIdVenta]);
                    if (checkExists[0].count === 0) {
                        await connection.rollback();
                        return res.status(404).json({ success: false, message: 'Venta no encontrada para actualizar.' });
                    }
                    // Si llegamos aqu\u00ed, la venta existe pero no se actualiz\u00f3 (datos id\u00e9nticos)
                    console.log(`Venta ${updIdVenta} existe pero datos principales id\u00e9nticos. Procediendo con detalles y stock.`);

                }


                // 5. Iterar sobre 'updProductos' (los nuevos/actualizados), insertar en 'detalle_ventas' y actualizar stock (restar)
                const sqlDetalleInsertUpdate = "INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)";
                const sqlStockSubtractUpdate = "UPDATE productos SET stock = stock - ? WHERE id_producto = ? AND stock >= ?";

                for (const item of updProductos) {
                    const id_producto = parseInt(item.id_producto, 10);
                    const cantidad = parseInt(item.cantidad, 10);
                    const precio_unitario = parseFloat(item.precio_unitario);
                    const subtotal = cantidad * precio_unitario; // Recalcular subtotal

                    // 5a. Verificar stock DISPONIBLE antes de restar (¡CR\u00cdTICO!)
                    const [[product]] = await connection.execute("SELECT stock FROM productos WHERE id_producto = ?", [id_producto]);

                    if (!product) {
                        throw new Error(`Producto con ID ${id_producto} no encontrado.`);
                    }
                    if (product.stock < cantidad) {
                        throw new Error(`Stock insuficiente para el producto ID ${id_producto} durante la actualización. Stock actual: ${product.stock}, Cantidad solicitada: ${cantidad}`);
                    }

                    // 5b. Restar stock
                    const [stockUpdateResult] = await connection.execute(sqlStockSubtractUpdate, [cantidad, id_producto, cantidad]);
                    if (stockUpdateResult.affectedRows === 0) {
                        throw new Error(`No se pudo actualizar el stock para el producto ID ${id_producto} durante la resta en la actualización.`);
                    }

                    // 5c. Insertar nuevo detalle
                    await connection.execute(sqlDetalleInsertUpdate, [updIdVenta, id_producto, cantidad, precio_unitario, subtotal]);
                }

                // Commit la transacci\u00f3n si todo fue exitoso
                await connection.commit();
                res.json({ success: true, message: 'Venta actualizada exitosamente.' });


                break;

            case 'eliminar': // Eliminar venta (espera id_venta en body)
                // Validaci\u00f3n espec\u00edfica para 'eliminar'
                await body('id_venta').isInt({ min: 1 }).withMessage('ID de venta inválido o no proporcionado para eliminar.').run(req);

                const errorsEliminar = validationResult(req);
                if (!errorsEliminar.isEmpty()) {
                    const messages = errorsEliminar.array().map(err => err.msg).join(' ');
                    await connection.rollback();
                    return res.status(400).json({ success: false, message: messages });
                }

                const { id_venta: delIdVenta } = req.body;


                // --- L\u00f3gica de Base de Datos: Eliminar Venta (dentro de transacci\u00f3n) ---

                // 1. Obtener detalles de productos para devolver stock
                const [details] = await connection.execute("SELECT id_producto, cantidad FROM detalle_ventas WHERE id_venta = ?", [delIdVenta]);

                // 2. Devolver stock para cada producto
                const sqlStockAddDelete = "UPDATE productos SET stock = stock + ? WHERE id_producto = ?";
                for (const item of details) {
                    await connection.execute(sqlStockAddDelete, [parseInt(item.cantidad, 10), parseInt(item.id_producto, 10)]);
                }

                // 3. Eliminar detalles de detalle_ventas (importante antes de eliminar la venta principal)
                await connection.execute("DELETE FROM detalle_ventas WHERE id_venta = ?", [delIdVenta]);

                // 4. Eliminar la venta principal de 'ventas'
                const [deleteVentaResult] = await connection.execute("DELETE FROM ventas WHERE id_venta = ?", [delIdVenta]);

                if (deleteVentaResult.affectedRows === 0) {
                    // Si 0 filas afectadas, la venta no exist\u00eda. Rollback.
                    await connection.rollback();
                    return res.status(404).json({ success: false, message: 'No se encontró la venta para eliminar.' });
                }

                // Commit transacci\u00f3n si la eliminaci\u00f3n fue exitosa
                await connection.commit();
                res.json({ success: true, message: 'Venta eliminada exitosamente.' });


                break;

            default:
                // Acci\u00f3n POST no v\u00e1lida
                await connection.rollback(); // Asegurarse de hacer rollback si la acci\u00f3n no es reconocida
                res.status(400).json({ success: false, message: 'Acción POST no válida o no especificada para ventas.' });
                break;
        }

    } catch (error) {
        // Manejo general de errores en transacciones: hacer rollback y reportar error
        if (connection) { // Asegurarse de que la conexi\u00f3n fue obtenida
            await connection.rollback(); // Asegurarse de hacer rollback
        }

        // handleDBError ya maneja si la respuesta ya fue enviada
        handleDBError(res, error, `rutaPOSTVentas:${action}`); // Pasa la acci\u00f3n para m\u00e1s contexto
    } finally {
        // Asegurarse de que la conexi\u00f3n se libere de vuelta al pool
        if (connection) { // Asegurarse de que la conexi\u00f3n fue obtenida
            connection.release();
        }
    }
});


module.exports = router;