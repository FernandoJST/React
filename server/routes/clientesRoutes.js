// server/routes/clientesRoutes.js
const express = require('express');
const router = express.Router();
// Importa el middleware de verificaci\u00f3n de token
const verifyToken = require('../middleware/authMiddleware'); // <--- IMPORTACI\u00d3N NECESARIA
const db = require('../conexion'); // Asume que esto exporta el pool con promesas

// --- Ruta GET para listar y obtener clientes ---
// APLICAR middleware verifyToken a esta ruta GET
router.get('/', verifyToken, async (req, res) => { // <--- verifyToken APLICADO AQU\u00cd
    const action = req.query.action;

    if (action === 'listar') {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        try {
            let countSql = "SELECT COUNT(*) AS total FROM clientes";
            let dataSql = "SELECT id_cliente, nombre, dni, telefono, direccion, fecha_registro FROM clientes";
            const queryParams = [];

            if (search) {
                const searchTerm = `%${search}%`;
                dataSql += " WHERE nombre LIKE ? OR dni LIKE ?";
                countSql += " WHERE nombre LIKE ? OR dni LIKE ?";
                queryParams.push(searchTerm, searchTerm);
            }

            dataSql += " ORDER BY nombre ASC LIMIT ? OFFSET ?";
            queryParams.push(limit, offset);

            const countParams = search ? [queryParams[0], queryParams[1]] : [];
            const [countRows] = await db.query(countSql, countParams);
            const totalClientes = countRows[0].total;

            const [clientes] = await db.query(dataSql, queryParams);

            // Formatear la fecha de registro
            const clientesFormateados = clientes.map(cliente => {
                if (cliente.fecha_registro) {
                    const date = new Date(cliente.fecha_registro);
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    return {
                        ...cliente,
                        fecha_registro: `${day}/${month}/${year} ${hours}:${minutes}`
                    };
                }
                return cliente;
            });

            res.json({ success: true, data: clientesFormateados, total: totalClientes, message: "Clientes listados con éxito." });

        } catch (error) {
            console.error('Error al listar clientes:', error);
            res.status(500).json({ success: false, message: 'Error al obtener la lista de clientes.', error: error.message });
        }

    } else if (action === 'obtener' && req.query.id) {
        const id = parseInt(req.query.id);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'ID de cliente inválido o no proporcionado.' });
        }
        try {
            const [rows] = await db.query("SELECT id_cliente, nombre, dni, telefono, direccion, fecha_registro FROM clientes WHERE id_cliente = ?", [id]);

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
            }

            const cliente = rows[0];

            // Formatear la fecha de registro
            if (cliente.fecha_registro) {
                const date = new Date(cliente.fecha_registro);
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                cliente.fecha_registro = `${day}/${month}/${year} ${hours}:${minutes}`;
            }

            // Devolvemos un objeto con success: true y los datos, m\u00e1s consistente con otras respuestas
            res.json({ success: true, data: cliente, message: "Cliente obtenido con éxito." });


        } catch (error) {
            console.error(`Error al obtener cliente (ID: ${id}):`, error);
            res.status(500).json({ success: false, message: 'Error al obtener el cliente.', error: error.message });
        }

    } else {
        res.status(400).json({ success: false, message: 'Acción GET no válida o no especificada para clientes.' });
    }
});

// --- Ruta POST para agregar, actualizar o eliminar clientes ---
// APLICAR middleware verifyToken a esta ruta POST
router.post('/', verifyToken, async (req, res) => { // <--- verifyToken APLICADO AQU\u00cd
    const { action, id_cliente, nombre, dni, telefono, direccion } = req.body;

    // Opcional: req.user ahora contiene la info del usuario logueado
    // console.log('Usuario autenticado en ruta clientes POST:', req.user);


    try {
        if (action === 'agregar') {
            if (!nombre || !dni) {
                const errors = [];
                if (!nombre) errors.push('Nombre es requerido.');
                if (!dni) errors.push('DNI es requerido.');
                return res.status(400).json({ success: false, message: 'Datos invalidos: ' + errors.join(' ') });
            }

            const [existingDniRows] = await db.query("SELECT COUNT(*) AS count FROM clientes WHERE dni = ?", [dni]);
            if (existingDniRows[0].count > 0) {
                return res.status(409).json({ success: false, message: 'Ya existe un cliente registrado con este DNI.' });
            }

            const [result] = await db.query("INSERT INTO clientes (nombre, dni, telefono, direccion) VALUES (?, ?, ?, ?)",
                [nombre, dni, telefono || null, direccion || null]
            );

            if (result.affectedRows === 0) {
                throw new Error('No se pudo insertar el cliente en la base de datos.');
            }

            res.json({ success: true, message: 'Cliente agregado exitosamente.', id_cliente: result.insertId });

        } else if (action === 'actualizar') {
            if (!id_cliente || isNaN(id_cliente) || id_cliente <= 0 || !nombre || !dni) {
                const errors = [];
                if (!id_cliente || isNaN(id_cliente) || id_cliente <= 0) errors.push('ID de cliente inválido.');
                if (!nombre) errors.push('Nombre es requerido.');
                if (!dni) errors.push('DNI es requerido.');
                return res.status(400).json({ success: false, message: 'Datos invalidos para actualizar: ' + errors.join(' ') });
            }

            const [duplicateDniRows] = await db.query("SELECT COUNT(*) AS count FROM clientes WHERE dni = ? AND id_cliente != ?", [dni, id_cliente]);
            if (duplicateDniRows[0].count > 0) {
                return res.status(409).json({ success: false, message: 'Ya existe otro cliente registrado con este DNI.' });
            }

            const [result] = await db.query("UPDATE clientes SET nombre=?, dni=?, telefono=?, direccion=? WHERE id_cliente=?",
                [nombre, dni, telefono || null, direccion || null, id_cliente]
            );

            if (result.affectedRows === 0) {
                const [checkExists] = await db.query("SELECT COUNT(*) AS count FROM clientes WHERE id_cliente = ?", [id_cliente]);
                if (checkExists[0].count === 0) {
                    return res.status(404).json({ success: false, message: 'Cliente no encontrado para actualizar.' });
                }
                res.json({ success: true, message: 'No se realizaron cambios (datos idénticos).' });

            } else {
                res.json({ success: true, message: 'Cliente actualizado exitosamente.' });
            }


        } else if (action === 'eliminar') {
            if (!id_cliente || isNaN(id_cliente) || id_cliente <= 0) {
                return res.status(400).json({ success: false, message: 'ID de cliente inválido o no proporcionado para eliminar.' });
            }
            try {
                const [result] = await db.query("DELETE FROM clientes WHERE id_cliente = ?", [id_cliente]);

                if (result.affectedRows === 0) {
                    return res.status(404).json({ success: false, message: 'No se encontro el cliente para eliminar.' });
                }

                res.json({ success: true, message: 'Cliente eliminado exitosamente.' });

            } catch (error) {
                // Capturar error espec\u00edfico de clave for\u00e1nea (c\u00f3digo SQLSTATE 23000 o errno 1451)
                if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
                    return res.status(409).json({ success: false, message: 'Error: No se puede eliminar el cliente porque tiene ventas asociadas.' });
                }
                throw error; // Ir al catch externo
            }

        } else {
            res.status(400).json({ success: false, message: 'Acción POST no válida o no especificada para clientes.' });
        }
    } catch (error) {
        console.error('Error en operación de cliente:', error);
        // Capturar error espec\u00edfico de clave duplicada (DNI) (c\u00f3digo SQLSTATE 23000 o errno 1062)
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(409).json({ success: false, message: 'Error: El DNI proporcionado ya existe.' });
        }
        // Manejador general para otros errores inesperados
        res.status(500).json({ success: false, message: 'Error en el servidor al procesar la solicitud de cliente.', error: error.message });
    }
});


module.exports = router; // Exportar el router de Express