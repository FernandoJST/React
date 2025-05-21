// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Para comparar y hashear contraseñas con bcrypt
const jwt = require('jsonwebtoken'); // Para generar JSON Web Tokens (JWT)
const crypto = require('crypto'); // Módulo nativo de Node.js para hashing (usado aquí para MD5)

// Importamos directamente la conexión a la base de datos
const db = require('../conexion');

// Clave secreta para firmar los JWT. Cámbiala por una cadena larga y aleatoria en tu archivo .env
const jwtSecret = process.env.JWT_SECRET || 'superclave_secreta_por_defecto'; // Usa una clave por defecto SOLO en desarrollo

// --- Ruta POST para manejar el inicio de sesión ---
// Corresponde a la lógica principal de login.php
router.post('/login', async (req, res) => {
  // Obtener usuario y contraseña del cuerpo de la petición (enviados por el frontend)
  const { nombre_usuario, contrasena } = req.body;

  console.log('Intento de login recibido para:', nombre_usuario);
  console.log('Datos recibidos:', req.body);

  // Validar campos obligatorios
  if (!nombre_usuario || !contrasena) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña son requeridos.' });
  }

  try {
    // --- Lógica de Base de Datos: Obtener usuario y su hash de contraseña ---
    // Selecciona la contraseña hasheada (¡necesaria para la verificación!) y el rol
    console.log('Buscando usuario en la base de datos...');
    const [rows] = await db.query("SELECT id_usuario, nombre_usuario, contraseña, rol FROM usuarios WHERE nombre_usuario = ?", [nombre_usuario]);
    console.log('Resultado de búsqueda:', rows.length > 0 ? 'Usuario encontrado' : 'Usuario no encontrado');

    const usuarioEncontrado = rows[0]; // Obtiene el primer (y único) resultado

    // Verificar si el usuario fue encontrado
    if (!usuarioEncontrado) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }

    let passwordValida = false;
    const hashAlmacenado = usuarioEncontrado.contraseña;
    console.log('Tipo de hash detectado:', hashAlmacenado.startsWith('$2') ? 'Bcrypt' : 
                (hashAlmacenado.length === 32 && /^[0-9a-fA-F]+$/.test(hashAlmacenado)) ? 'MD5' : 'Desconocido');

    // --- Lógica de Verificación de Contraseña (incluyendo compatibilidad con MD5) ---

    // 1. Intentar verificar como hash Bcrypt (generado por password_hash)
    if (hashAlmacenado && (hashAlmacenado.startsWith('$2y$') || hashAlmacenado.startsWith('$2a$'))) {
        passwordValida = await bcrypt.compare(contrasena, hashAlmacenado);
        console.log('Verificación Bcrypt:', passwordValida ? 'Exitosa' : 'Fallida');
    }

    // 2. Si la verificación con Bcrypt falló, verificar si el hash almacenado parece ser MD5
    if (!passwordValida && hashAlmacenado && typeof hashAlmacenado === 'string' && hashAlmacenado.length === 32 && /^[0-9a-fA-F]+$/.test(hashAlmacenado)) {
        // Parece ser MD5. Comparar con el hash MD5 de la contraseña proporcionada.
        const md5HashProporcionado = crypto.createHash('md5').update(contrasena).digest('hex');
        passwordValida = (md5HashProporcionado === hashAlmacenado);
        console.log('Verificación MD5:', passwordValida ? 'Exitosa' : 'Fallida');

        // Opcional: Si la contraseña MD5 es válida, actualizarla a Bcrypt en la base de datos
        if (passwordValida) {
            try {
                const nuevoHash = await bcrypt.hash(contrasena, 10);
                // Lógica de Base de Datos: Actualizar la contraseña a nuevo hash Bcrypt
                await db.query("UPDATE usuarios SET contraseña = ? WHERE id_usuario = ?", [nuevoHash, usuarioEncontrado.id_usuario]);
                console.log(`Contraseña de usuario ${usuarioEncontrado.id_usuario} actualizada a Bcrypt.`); // Log para depuración
            } catch (updateError) {
                console.error(`Error al actualizar contraseña MD5 a Bcrypt para usuario ${usuarioEncontrado.id_usuario}:`, updateError);
                // Continuar el login a pesar del error en la actualización del hash
            }
        }
    }

    // --- Manejo del Resultado de la Autenticación ---
    if (passwordValida) {
        // --- Generar Token JWT (en lugar de sesiones PHP) ---
        // Incluimos en el token datos seguros y necesarios para el frontend (ID, username, rol)
        const payload = {
          id: usuarioEncontrado.id_usuario,
          username: usuarioEncontrado.nombre_usuario,
          role: usuarioEncontrado.rol, // Asegúrate de que el nombre de la columna sea 'rol' en tu DB
        };

        console.log('Generando token JWT para el usuario...');
        // Generar el token con una clave secreta y expiración
        const token = jwt.sign(payload, jwtSecret, { expiresIn: '24h' }); // Token válido por 24 horas (ajústalo)

        // Devolver respuesta de éxito con el token y datos del usuario
        console.log('Login exitoso, enviando respuesta al cliente');
        res.json({
          success: true,
          message: 'Login exitoso',
          token: token, // Envía el token al frontend
          // También puedes enviar algunos datos del usuario si el frontend los necesita inmediatamente
          user: {
            id_usuario: usuarioEncontrado.id_usuario,
            username: usuarioEncontrado.nombre_usuario,
            role: usuarioEncontrado.rol
          }
        });

    } else {
        // Contraseña incorrecta (después de probar ambos métodos)
        console.log('Contraseña inválida, enviando respuesta de error');
        res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }

  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    // Manejar errores de base de datos u otros errores inesperados
    res.status(500).json({ success: false, message: 'Error al procesar la solicitud. Intente más tarde.', error: error.message });
  }
});

const verifyToken = require('../middleware/authMiddleware'); // Necesitarías crear este middleware

router.get('/verify', verifyToken, (req, res) => {
  // Si el middleware verifyToken adjuntó el usuario a req.user, significa que el token es válido
  res.json({
    success: true,
    message: 'Token válido',
    user: req.user // El usuario decodificado del token por el middleware
  });
});

module.exports = router;