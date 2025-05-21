// server/routes/productosRoutes.js
const express = require('express');
const router = express.Router();
// Importa el middleware de verificaci\u00f3n de token
const verifyToken = require('../middleware/authMiddleware');
// Si necesitas formatear fechas, puedes usar una librería como 'moment' o métodos nativos Date
// const moment = require('moment'); // npm install moment
const db = require('../conexion'); // <-- Asume que esto exporta el pool con promesas

// Importar funciones de validaci\u00f3n y resultado de validaci\u00f3n (si las vas a usar en el futuro, aunque el c\u00f3digo proporcionado no las usa expl\u00edcitamente con middleware)
// const { body, query, validationResult } = require('express-validator');


// --- Rutas GET para listar productos, obtener producto, listar categorías - PROTEGIDAS ---
// Maneja las acciones 'listar', 'obtener', 'listar_categorias', 'listar_categorias_todas'
// Se aplica verifyToken a todas las peticiones a esta ruta base
router.get('/', verifyToken, async (req, res) => {
    const action = req.query.action; // Leer el parámetro 'action' de la URL

    try { // Envuelve la lógica del switch en un try-catch general
        switch (action) {
            case 'listar': // Listar productos con paginación
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                // Tu PHP de productos no tenía búsqueda, pero podríamos añadirla si el frontend la implementa
                const search = req.query.search || ''; // Asegurarse de que 'search' exista
                const offset = (page - 1) * limit;

                // Validaci\u00f3n b\u00e1sica de paginaci\u00f3n
                if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
                     return res.status(400).json({ success: false, message: 'Par\u00e1metros de paginaci\u00f3n inv\u00e1lidos.' });
                }


                // --- Lógica de base de datos para listar productos ---
                // IMPORTANTE: Eliminar los espacios iniciales en las l\u00edneas siguientes
                let countSql = `SELECT COUNT(*) AS total FROM productos p LEFT JOIN categorias c ON p.id_categoria = c.id_categoria`;
                let dataSql = `SELECT p.id_producto, p.nombre, p.descripcion, p.stock, p.precio, c.nombre AS categoria, p.id_categoria FROM productos p LEFT JOIN categorias c ON p.id_categoria = c.id_categoria`;

                const queryParams = []; // Para la b\u00fasqueda si la a\u00f1ades

                 if (search) {
                     const searchTerm = `%${search}%`;
                     dataSql += " WHERE p.nombre LIKE ? OR p.descripcion LIKE ?"; // Ejemplo de b\u00fasqueda por nombre o desc
                     countSql += " WHERE p.nombre LIKE ? OR p.descripcion LIKE ?";
                     queryParams.push(searchTerm, searchTerm);
                 }


                dataSql += " ORDER BY p.nombre ASC LIMIT ? OFFSET ?";
                // A\u00f1adir par\u00e1metros de paginaci\u00f3n al final de los par\u00e1metros de b\u00fasqueda (si existen)
                const dataParams = [...queryParams, limit, offset];

                // Par\u00e1metros solo para el conteo (sin limit/offset). Usan los mismos par\u00e1metros de b\u00fasqueda.
                const countParams = [...queryParams];


                // Ejecutar consulta para obtener el total de productos
                const [countRows] = await db.query(countSql, countParams); // Usar countParams
                const totalProductos = countRows[0].total;

                // Ejecutar consulta para obtener los productos de la página actual
                const [productos] = await db.query(dataSql, dataParams); // Usar dataParams

                // Nota: La fecha_ingreso no se selecciona en tu PHP listarProductos.
                // Si necesitas formatear fechas, hazlo aquí para cada producto.
                res.json({ success: true, data: productos, total: totalProductos, message: "Productos listados con éxito." });

                break; // Fin case 'listar'

            case 'obtener': // Obtener un solo producto por ID
                const id = parseInt(req.query.id);
                if (isNaN(id) || id <= 0) {
                    return res.status(400).json({ success: false, message: 'ID de producto inválido o no proporcionado.' });
                }
                // --- Lógica de base de datos para obtener un producto por ID ---
                const [rows] = await db.query("SELECT id_producto, nombre, descripcion, stock, precio, id_categoria FROM productos WHERE id_producto = ?", [id]);
                if (rows.length === 0) {
                    return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
                }

                const producto = rows[0];
                // Asegurarse de que los tipos sean correctos (opcional, pero buena práctica)
                producto.id_producto = parseInt(producto.id_producto);
                producto.stock = parseInt(producto.stock);
                producto.precio = parseFloat(producto.precio);
                // Convertir id_categoria a int o null si es necesario (el campo puede ser null en DB)
                 producto.id_categoria = producto.id_categoria ? parseInt(producto.id_categoria) : null;


                res.json(producto); // Devolver directamente el objeto producto

                break; // Fin case 'obtener'

            case 'listar_categorias': // Listar categorías con paginación (para modal de categorías)
                const pageCat = parseInt(req.query.page) || 1;
                const limitCat = parseInt(req.query.limit) || 5; // L\u00edmite m\u00e1s bajo seg\u00fan tu PHP
                const offsetCat = (pageCat - 1) * limitCat;

                 // Validaci\u00f3n b\u00e1sica de paginaci\u00f3n
                 if (isNaN(pageCat) || pageCat < 1 || isNaN(limitCat) || limitCat < 1) {
                      return res.status(400).json({ success: false, message: 'Par\u00e1metros de paginaci\u00f3n de categor\u00edas inv\u00e1lidos.' });
                 }

                // Tu PHP de categorías no tenía búsqueda, pero podríamos añadirla si el frontend la implementa
                const searchCat = req.query.search || ''; // Asegurarse de que 'search' exista
                const queryParamsCat = [];

                 let countSqlCat = "SELECT COUNT(*) AS total FROM categorias";
                 let dataSqlCat = "SELECT id_categoria, nombre FROM categorias";

                 if (searchCat) {
                      const searchTermCat = `%${searchCat}%`;
                      dataSqlCat += " WHERE nombre LIKE ?";
                      countSqlCat += " WHERE nombre LIKE ?";
                      queryParamsCat.push(searchTermCat);
                  }

                 dataSqlCat += " ORDER BY nombre ASC LIMIT ? OFFSET ?";
                 const dataParamsCat = [...queryParamsCat, limitCat, offsetCat];
                 const countParamsCat = [...queryParamsCat]; // Par\u00e1metros solo para el conteo


                // --- Lógica de base de datos para listar categorías paginadas ---
                const [countRowsCat] = await db.query(countSqlCat, countParamsCat); // Usar countParamsCat
                const totalCategorias = countRowsCat[0].total;

                const [categorias] = await db.query(dataSqlCat, dataParamsCat); // Usar dataParamsCat

                res.json({ success: true, data: categorias, total: totalCategorias, message: "Categorías listadas con éxito." });

                break; // Fin case 'listar_categorias'

            case 'listar_categorias_todas': // Listar TODAS las categorías (para el select en formulario producto)
                // --- Lógica de base de datos para listar TODAS las categorías ---
                const [categoriasTodas] = await db.query("SELECT id_categoria, nombre FROM categorias ORDER BY nombre ASC");
                // Tu PHP devolvía directamente el array. Lo mantenemos para compatibilidad con frontend si espera eso.
                res.json(categoriasTodas);

                break; // Fin case 'listar_categorias_todas'

            default:
                // Acción GET no válida
                res.status(400).json({ success: false, message: 'Acción GET no válida o no especificada para productos/categorías.' });
                break;
        }

    } catch (error) {
        console.error('Error en rutaGETProductos:', error);
         // Env\u00eda una respuesta gen\u00e9rica de error de servidor
        res.status(500).json({ success: false, message: 'Error de base de datos al procesar la petición.', error: error.message });
    }
});


// --- Ruta POST para agregar, actualizar, eliminar productos o categorías - PROTEGIDAS ---
// Usa el parámetro 'action' en el cuerpo de la petición
// Se aplica verifyToken a todas las peticiones a esta ruta base
router.post('/', verifyToken, async (req, res) => {
    // Leer los campos del cuerpo de la petición. express.json o express.urlencoded ya los parse\u00f3.
    const { action } = req.body;

    try { // Envuelve la lógica del switch en un try-catch general
        switch (action) {
            case 'agregar': // Agregar nuevo producto
                const { nombre, descripcion, stock, precio, id_categoria } = req.body;

                // Validar campos requeridos (nombre, stock, precio, id_categoria) y tipos
                const parsedStock = parseInt(stock);
                const parsedPrecio = parseFloat(precio);
                const parsedCategoriaId = parseInt(id_categoria);


                 if (!nombre || typeof nombre !== 'string' || nombre.trim() === '' || isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock) || isNaN(parsedPrecio) || parsedPrecio < 0 || isNaN(parsedCategoriaId) || parsedCategoriaId <= 0) {
                     const errors = [];
                     if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') errors.push('Nombre es requerido.');
                     if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) errors.push('Stock debe ser un número entero >= 0.');
                     if (isNaN(parsedPrecio) || parsedPrecio < 0) errors.push('Precio debe ser un número válido >= 0.');
                     if (isNaN(parsedCategoriaId) || parsedCategoriaId <= 0) errors.push('Categoría es requerida.');

                     return res.status(400).json({ success: false, message: 'Datos inválidos: ' + errors.join(' ') });
                 }

                // Asegurarse de que la descripci\u00f3n sea string o null
                 const safeDescripcion = (descripcion === undefined || descripcion === null || descripcion === '') ? null : String(descripcion);


                // --- Lógica de base de datos para agregar producto ---
                // El campo fecha_ingreso debería tener un valor por defecto CURRENT_TIMESTAMP en tu DB
                const [result] = await db.query("INSERT INTO productos (nombre, descripcion, stock, precio, id_categoria) VALUES (?, ?, ?, ?, ?)",
                    [nombre.trim(), safeDescripcion, parsedStock, parsedPrecio, parsedCategoriaId] // Usar null si descripci\u00f3n est\u00e1 vac\u00eda
                );
                 if (result.affectedRows === 0) {
                     throw new Error('No se pudo insertar el producto en la base de datos.');
                 }


                res.status(201).json({ success: true, message: 'Producto agregado exitosamente.', id_producto: result.insertId }); // 201 Created


                break; // Fin case 'agregar'

            case 'actualizar': // Actualizar producto
                const { id_producto, nombre: updNombre, descripcion: updDescripcion, stock: updStock, precio: updPrecio, id_categoria: updIdCategoria } = req.body;

                // Validar ID y campos requeridos para actualizar
                const parsedUpdId = parseInt(id_producto);
                const parsedUpdStock = parseInt(updStock);
                const parsedUpdPrecio = parseFloat(updPrecio);
                const parsedUpdCategoriaId = parseInt(updIdCategoria);

                if (!parsedUpdId || isNaN(parsedUpdId) || parsedUpdId <= 0 || !updNombre || typeof updNombre !== 'string' || updNombre.trim() === '' || isNaN(parsedUpdStock) || parsedUpdStock < 0 || !Number.isInteger(parsedUpdStock) || isNaN(parsedUpdPrecio) || parsedUpdPrecio < 0 || isNaN(parsedUpdCategoriaId) || parsedUpdCategoriaId <= 0) {
                     const errors = [];
                     if (!parsedUpdId || isNaN(parsedUpdId) || parsedUpdId <= 0) errors.push('ID de producto inválido.');
                     if (!updNombre || typeof updNombre !== 'string' || updNombre.trim() === '') errors.push('Nombre es requerido.');
                     if (isNaN(parsedUpdStock) || parsedUpdStock < 0 || !Number.isInteger(parsedUpdStock)) errors.push('Stock debe ser un número entero >= 0.');
                     if (isNaN(parsedUpdPrecio) || parsedUpdPrecio < 0) errors.push('Precio debe ser un número válido >= 0.');
                     if (isNaN(parsedUpdCategoriaId) || parsedUpdCategoriaId <= 0) errors.push('Categoría es requerida.');

                     return res.status(400).json({ success: false, message: 'Datos inválidos para actualizar: ' + errors.join(' ') });
                 }

                 const safeUpdDescripcion = (updDescripcion === undefined || updDescripcion === null || updDescripcion === '') ? null : String(updDescripcion);


                // --- Lógica de base de datos para actualizar producto ---
                const [resultUpd] = await db.query("UPDATE productos SET nombre=?, descripcion=?, stock=?, precio=?, id_categoria=? WHERE id_producto=?",
                    [updNombre.trim(), safeUpdDescripcion, parsedUpdStock, parsedUpdPrecio, parsedUpdCategoriaId, parsedUpdId] // Usar null si descripci\u00f3n est\u00e1 vac\u00eda
                );
                // Verificar si la actualización afectó alguna fila
                if (resultUpd.affectedRows === 0) {
                     // Como en tu PHP, verificar si el producto realmente existe antes de decir que no se encontr\u00f3
                     const [checkExists] = await db.query("SELECT COUNT(*) AS count FROM productos WHERE id_producto = ?", [parsedUpdId]);
                     if (checkExists[0].count === 0) {
                          return res.status(404).json({ success: false, message: 'Producto no encontrado para actualizar.' });
                     }
                     // Si existe pero 0 filas afectadas, datos id\u00e9nticos
                     res.json({ success: true, message: 'No se realizaron cambios (datos idénticos).' });
                 } else {
                    res.json({ success: true, message: 'Producto actualizado exitosamente.' });
                }


                break; // Fin case 'actualizar'

            case 'eliminar': // Eliminar producto
                const { id_producto: delIdProducto } = req.body;
                const parsedDelId = parseInt(delIdProducto);

                if (!parsedDelId || isNaN(parsedDelId) || parsedDelId <= 0) {
                    return res.status(400).json({ success: false, message: 'ID de producto inválido o no proporcionado para eliminar.' });
                }
                 // --- Lógica de base de datos para eliminar producto ---
                const [resultDel] = await db.query("DELETE FROM productos WHERE id_producto = ?", [parsedDelId]);
                if (resultDel.affectedRows === 0) {
                    // Si 0 filas afectadas, el producto no exist\u00eda
                    return res.status(404).json({ success: false, message: 'No se encontró el producto para eliminar.' });
                }

                res.json({ success: true, message: 'Producto eliminado exitosamente.' });


                break; // Fin case 'eliminar'

            case 'agregar_categoria': // Agregar nueva categoría
                const { nombre: catNombre } = req.body;
                if (!catNombre || !catNombre.trim()) {
                    return res.status(400).json({ success: false, message: 'El nombre de la categoría no puede estar vacío.' });
                }
                const trimmedCatNombre = catNombre.trim();
                // --- Lógica de base de datos para agregar categoría ---
                 // Verificar si ya existe una categoría con ese nombre
                 const [existingCatRows] = await db.query("SELECT COUNT(*) AS count FROM categorias WHERE nombre = ?", [trimmedCatNombre]);
                 if (existingCatRows[0].count > 0) {
                     return res.status(409).json({ success: false, message: 'Error: Ya existe una categoría con ese nombre.' });
                 }

                const [resultCat] = await db.query("INSERT INTO categorias (nombre) VALUES (?)", [trimmedCatNombre]);
                if (resultCat.affectedRows === 0) {
                     throw new Error('No se pudo insertar la categoría en la base de datos.');
                 }


                res.status(201).json({ success: true, message: 'Categoría agregada exitosamente.', id_categoria: resultCat.insertId }); // 201 Created


                break; // Fin case 'agregar_categoria'

            case 'eliminar_categoria': // Eliminar categoría
                const { id_categoria: delIdCategoria } = req.body;
                const parsedDelIdCat = parseInt(delIdCategoria);

                if (!parsedDelIdCat || isNaN(parsedDelIdCat) || parsedDelIdCat <= 0) {
                    return res.status(400).json({ success: false, message: 'ID de categoría inválido o no proporcionado para eliminar.' });
                }

                // --- Lógica de base de datos para eliminar categoría ---
                 // **IMPORTANTE:** Verificar si la categoría está asignada a algún producto (como en tu PHP)
                 const [productCountRows] = await db.query("SELECT COUNT(*) AS count FROM productos WHERE id_categoria = ?", [parsedDelIdCat]);
                 const productCount = productCountRows[0].count;

                 if (productCount > 0) {
                     return res.status(409).json({ success: false, message: `No se puede eliminar la categoría porque está asignada a ${productCount} producto(s).` });
                 }

                 // Si no hay productos asignados, proceder a eliminar la categoría
                const [resultDelCat] = await db.query("DELETE FROM categorias WHERE id_categoria = ?", [parsedDelIdCat]);
                if (resultDelCat.affectedRows === 0) {
                     // Si 0 filas afectadas, la categoría no exist\u00eda
                    return res.status(404).json({ success: false, message: 'No se encontró la categoría para eliminar.' });
                }

                res.json({ success: true, message: 'Categoría eliminada exitosamente.' });


                break; // Fin case 'eliminar_categoria'

            default:
                // Acci\u00f3n POST no v\u00e1lida
                res.status(400).json({ success: false, message: 'Acción POST no válida o no especificada para productos/categorías.' });
                break;
        }

    } catch (error) {
        console.error('Error en rutaPOSTProductos:', error);
        // Manejo de errores m\u00e1s espec\u00edfico seg\u00fan el tipo de error de base de datos
         if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) { // Clave for\u00e1nea (referencia no existe)
             res.status(409).json({ success: false, message: 'Error de datos: La categor\u00eda o producto referenciado no existe.' });
         } else if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) { // Clave for\u00e1nea (est\u00e1 siendo referenciado)
              res.status(409).json({ success: false, message: 'Error de datos: No se puede eliminar porque est\u00e1 siendo utilizado en otro lugar.' });
         } else if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) { // Entrada duplicada
              res.status(409).json({ success: false, message: 'Error de datos: Ya existe un registro con el mismo valor \u00fanico (ej. nombre duplicado).' });
         }
         else {
             // Error gen\u00e9rico de base de datos
             res.status(500).json({ success: false, message: 'Error de base de datos al procesar la petición.', error: error.message });
         }
    }
});


module.exports = router; // Exportar el router de Express