// server/routes/usuariosRoutes.js
const express = require('express');
const router = express.Router();
// Para comparar y hashear contrase\u00f1as con bcrypt
const bcrypt = require('bcryptjs');

// Importa el middleware de verificaci\u00f3n de token
const verifyToken = require('../middleware/authMiddleware'); // <--- IMPORTACI\u00d3N NECESARIA

const db = require('../conexion'); // <-- Asume que esto exporta el pool con promesas

// --- Rutas GET - PROTEGIDAS ---
// APLICAR middleware verifyToken a esta ruta GET
router.get('/', verifyToken, async (req, res) => { // <--- verifyToken APLICADO AQU\u00cd
    const action = req.query.action; // Leer el parámetro 'action' de la URL

    // Opcional: req.user ahora contiene la info del usuario del token si verifyToken fue exitoso
    // console.log('Usuario autenticado en ruta usuarios GET:', req.user);


    try {
        switch (action) {
            case 'listar': // Listar usuarios con paginación y búsqueda
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const search = req.query.search || ''; // Leer término de búsqueda
                const offset = (page - 1) * limit;

                // --- Lógica de base de datos para listar usuarios ---
                let countSql = "SELECT COUNT(*) AS total FROM usuarios"; // Alias para obtener el total
                // NO SELECCIONAR LA CONTRASEÑA por seguridad
                let dataSql = "SELECT id_usuario, nombre_usuario, rol FROM usuarios"; // Solo campos seguros
                const queryParams = []; // Array para los parámetros de la consulta

                // Añadir filtro de búsqueda si existe
                if (search) {
                    const searchTerm = `%${search}%`;
                    dataSql += " WHERE nombre_usuario LIKE ?"; // Filtrar por nombre de usuario
                    countSql += " WHERE nombre_usuario LIKE ?"; // Filtrar por nombre de usuario
                    queryParams.push(searchTerm); // Añadir parámetro de búsqueda
                }

                // Ordenar por nombre de usuario y aplicar paginación
                dataSql += " ORDER BY nombre_usuario ASC LIMIT ? OFFSET ?";
                queryParams.push(limit, offset); // Añadir parámetros de paginación

                // Ejecutar consulta para obtener el total de usuarios (con o sin filtro)
                const countParams = search ? [queryParams[0]] : []; // Pasa el parámetro de búsqueda solo si aplica
                const [countRows] = await db.query(countSql, countParams);
                const totalUsuarios = countRows[0].total;

                // Ejecutar consulta para obtener los datos de la página actual
                const [usuarios] = await db.query(dataSql, queryParams);
                res.json({ success: true, data: usuarios, total: totalUsuarios, message: "Usuarios listados con éxito." });

                break;
            case 'obtener': // Obtener un solo usuario por ID
                const id = parseInt(req.query.id);
                // Validar el ID de usuario
                if (isNaN(id) || id <= 0) {
                    return res.status(400).json({ success: false, message: 'ID de usuario inválido o no proporcionado.' });
                }
                // --- Lógica de base de datos para obtener un usuario ---
                // NO SELECCIONAR LA CONTRASEÑA por seguridad
                const [rows] = await db.query("SELECT id_usuario, nombre_usuario, rol FROM usuarios WHERE id_usuario = ?", [id]);
                const usuario = rows[0]; // Obtiene el primer (y único) resultado

                // Verificar si el usuario fue encontrado
                if (!usuario) {
                    return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
                }
                // Asegurar que el ID es un n\u00famero para consistencia
                usuario.id_usuario = parseInt(usuario.id_usuario);
                res.json(usuario); // Devolver el objeto usuario (con nombre_usuario y rol, sin password)

                break;
            default:
                // Acción GET no válida
                res.status(400).json({ success: false, message: 'Acción GET no válida o no especificada para usuarios.' });
                break;
        }
    } catch (error) {
        console.error('Error en ruta GET /api/usuarios:', error);
        // Manejo general de errores para rutas GET
        // Asegurarse de no intentar enviar una respuesta si ya se envi\u00f3 una (ej. 404 o 400 expl\u00edcito)
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Error en el servidor al procesar la solicitud GET de usuarios.', error: error.message });
        }
    }
});

// --- Ruta POST para agregar, actualizar o eliminar usuarios - PROTEGIDAS ---
// APLICAR middleware verifyToken a esta ruta POST
router.post('/', verifyToken, async (req, res) => { // <--- verifyToken APLICADO AQU\u00cd
    // Leer el par\u00e1metro 'action' del cuerpo de la petici\u00f3n
    const { action, id_usuario, nombre_usuario, contrasena, rol } = req.body;

    // Opcional: req.user ahora contiene la info del usuario del token si verifyToken fue exitoso
    // console.log('Usuario autenticado en ruta usuarios POST:', req.user);


    try {
        switch (action) {
            case 'agregar':
                if (!nombre_usuario || !contrasena || !rol) {
                    const errors = [];
                    if (!nombre_usuario) errors.push('Nombre de usuario es requerido.');
                    if (!contrasena) errors.push('Contraseña es requerida.');
                    if (!rol) errors.push('Rol es requerido.');
                    return res.status(400).json({ success: false, message: 'Datos invalidos: ' + errors.join(' ') });
                }
                // Validar que el rol sea uno de los permitidos
                const allowedRoles = ['admin', 'vendedor']; // Define los roles permitidos
                if (!allowedRoles.includes(rol)) {
                    return res.status(400).json({ success: false, message: 'Rol inválido. Debe ser "admin" o "vendedor".' });
                }


                // Verificar si ya existe un usuario con el mismo nombre
                const [existingUserRows] = await db.query("SELECT COUNT(*) AS count FROM usuarios WHERE nombre_usuario = ?", [nombre_usuario]);
                if (existingUserRows[0].count > 0) {
                    return res.status(409).json({ success: false, message: 'Ya existe un usuario registrado con este nombre de usuario.' });
                }

                // Hashear la contrase\u00f1a
                const hashedPassword = await bcrypt.hash(contrasena, 10);
                // Insertar nuevo usuario en la base de datos
                const [result] = await db.query("INSERT INTO usuarios (nombre_usuario, contraseña, rol) VALUES (?, ?, ?)", [nombre_usuario, hashedPassword, rol]);
                // Verificar si la inserci\u00f3n fue exitosa
                if (result.affectedRows === 0) {
                    throw new Error('No se pudo insertar el usuario en la base de datos.');
                }


                res.json({ success: true, message: 'Usuario agregado exitosamente.', id_usuario: result.insertId });
                break;

            case 'actualizar':
                const parsedIdUsuario = parseInt(id_usuario); // Asegurar que el ID sea un n\u00famero
                // Validar datos necesarios para actualizar
                if (!parsedIdUsuario || isNaN(parsedIdUsuario) || parsedIdUsuario <= 0 || !nombre_usuario || !rol) {
                    const errors = [];
                    if (!parsedIdUsuario || isNaN(parsedIdUsuario) || parsedIdUsuario <= 0) errors.push('ID de usuario inválido.');
                    if (!nombre_usuario) errors.push('Nombre de usuario es requerido.');
                    if (!rol) errors.push('Rol es requerido.');
                    return res.status(400).json({ success: false, message: 'Datos invalidos para actualizar: ' + errors.join(' ') });
                }
                // Validar que el rol sea uno de los permitidos
                const allowedRolesUpd = ['admin', 'vendedor']; // Define los roles permitidos
                if (!allowedRolesUpd.includes(rol)) {
                    return res.status(400).json({ success: false, message: 'Rol inválido. Debe ser "admin" o "vendedor".' });
                }


                // Verificar si el nuevo nombre de usuario ya existe en otro usuario (excluyendo el actual)
                const [duplicateUserRows] = await db.query("SELECT COUNT(*) AS count FROM usuarios WHERE nombre_usuario = ? AND id_usuario != ?", [nombre_usuario, parsedIdUsuario]);
                if (duplicateUserRows[0].count > 0) {
                    return res.status(409).json({ success: false, message: 'Ya existe otro usuario registrado con este nombre de usuario.' });
                }

                // Construir la consulta SQL dinámicamente para incluir la contrase\u00f1a solo si se proporciona
                let updateSql = "UPDATE usuarios SET nombre_usuario = ?, rol = ?";
                const updateParams = [nombre_usuario, rol];

                // Si se proporciona una nueva contrase\u00f1a v\u00e1lida (no vac\u00eda)
                if (contrasena && typeof contrasena === 'string' && contrasena.trim() !== '') {
                    const hashed_password = await bcrypt.hash(contrasena.trim(), 10); // Hashear la nueva contrase\u00f1a
                    updateSql += ", contraseña = ?"; // A\u00f1adir campo contrase\u00f1a a la consulta
                    updateParams.push(hashed_password); // A\u00f1adir contrase\u00f1a hasheada a los parámetros
                }

                // A\u00f1adir la condici\u00f3n WHERE y el ID del usuario a los parámetros
                updateSql += " WHERE id_usuario = ?";
                updateParams.push(parsedIdUsuario);

                // Ejecutar la consulta de actualizaci\u00f3n
                const [updateResult] = await db.query(updateSql, updateParams);
                // Verificar si se actualiz\u00f3 alguna fila
                if (updateResult.affectedRows === 0) {
                    // Si 0 filas afectadas, verificar si el usuario exist\u00eda (puede ser que los datos fueran id\u00e9nticos)
                    const [checkExists] = await db.query("SELECT COUNT(*) AS count FROM usuarios WHERE id_usuario = ?", [parsedIdUsuario]);
                    if (checkExists[0].count === 0) {
                        return res.status(404).json({ success: false, message: 'Usuario no encontrado para actualizar.' });
                    }
                    // Si el usuario existe pero no se actualizaron filas, los datos eran id\u00e9nticos (excepto quiz\u00e1s la contrase\u00f1a si no se cambi\u00f3)
                    res.json({ success: true, message: 'No se realizaron cambios (datos idénticos).' });
                } else {
                    res.json({ success: true, message: 'Usuario actualizado exitosamente.' });
                }

                break;
            case 'eliminar':
                // Leer ID de usuario del body
                const { id_usuario: delIdUsuario } = req.body;
                const parsedDelIdUsuario = parseInt(delIdUsuario); // Asegurar que el ID sea un n\u00famero

                // Validar el ID de usuario
                if (!parsedDelIdUsuario || isNaN(parsedDelIdUsuario) || parsedDelIdUsuario <= 0) {
                    return res.status(400).json({ success: false, message: 'ID de usuario inválido o no proporcionado para eliminar.' });
                }

                try {
                    // Eliminar usuario de la base de datos
                    const [deleteResult] = await db.query("DELETE FROM usuarios WHERE id_usuario = ?", [parsedDelIdUsuario]);
                    // Verificar si se elimin\u00f3 alguna fila
                    if (deleteResult.affectedRows === 0) {
                        // Si 0 filas afectadas, el usuario no exist\u00eda
                        return res.status(404).json({ success: false, message: 'No se encontro el usuario para eliminar.' });
                    }

                    res.json({ success: true, message: 'Usuario eliminado exitosamente.' });
                } catch (error) {
                    // Capturar error espec\u00edfico de clave for\u00e1nea (si el usuario est\u00e1 referenciado en ventas, etc.)
                    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
                        return res.status(409).json({ success: false, message: 'Error: No se puede eliminar el usuario porque está siendo referenciado en otra parte del sistema (ej. ventas asociadas).' });
                    }
                    throw error; // Relanzar otros errores para ser capturados por el catch externo
                }

            default:
                // Acción POST no válida
                res.status(400).json({ success: false, message: 'Acción POST no válida o no especificada para usuarios.' });
                break;
        }

    } catch (error) {
        // Manejo general de errores para rutas POST
        console.error('Error en ruta POST /api/usuarios:', error.message, error);
        // Capturar error espec\u00edfico de clave duplicada (nombre de usuario)
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(409).json({ success: false, message: 'Error: El nombre de usuario proporcionado ya existe.' });
        }
        // Asegurarse de no intentar enviar una respuesta si ya se envi\u00f3 una
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Error en el servidor al procesar la solicitud POST de usuarios.', error: error.message });
        }

    }
    // Nota: No hay transacciones en estas operaciones de usuario simples (excepto si a\u00f1adiste alguna)
    // por lo que no se requiere rollback/commit/release de conexi\u00f3n manual aqu\u00ed,
    // a menos que tu db.query lo maneje impl\u00edcitamente o si a\u00f1adiste transacciones despu\u00e9s.
});


module.exports = router; // Exportar la \u00fanica instancia del router