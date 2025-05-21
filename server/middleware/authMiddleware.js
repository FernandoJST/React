// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Usa la misma clave secreta que en authRoutes.js
const jwtSecret = process.env.JWT_SECRET || 'superclave_secreta_por_defecto';

const verifyToken = (req, res, next) => {
  // Obtener el token del encabezado Authorization
  // El formato típico es "Bearer TOKEN"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extrae el token después de "Bearer"

  // Si no hay token, devolver error 401 (No autorizado)
  if (token == null) {
    return res.status(401).json({ success: false, message: 'Acceso denegado. Token no proporcionado.' });
  }

  // Verificar el token
  jwt.verify(token, jwtSecret, (err, decoded) => {
    // Si hay un error (token inválido o expirado), devolver error 403 (Prohibido)
    if (err) {
      console.error('Error verificando token JWT:', err.message);
      return res.status(403).json({ success: false, message: 'Token inválido o expirado.' });
    }

    // Si el token es válido, guardar la información decodificada del usuario en req.user
    // Esto hace que la info del usuario (id, username, role) esté disponible en las rutas protegidas
    req.user = decoded; // 'decoded' contiene el payload que pusimos al crear el token (id, username, role)

    // Pasar al siguiente middleware o manejador de ruta
    next();
  });
};

module.exports = verifyToken;