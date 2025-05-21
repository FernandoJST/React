// server/server.js
const express = require('express');
const cors = require('cors'); // Importa el middleware CORS
const dotenv = require('dotenv'); // Importa dotenv para cargar .env

// Cargar variables de entorno desde el archivo .env (en la raíz del proyecto server)
dotenv.config();

const app = express();
// Usar el puerto de las variables de entorno o 3001 por defecto
const port = process.env.PORT || 3001;

app.use(cors({
  origin: true, // Permitir solicitudes desde cualquier origen (ajusta en producci\u00f3n)
  credentials: true // Permitir env\u00edo de cookies si las usas
}));

// Middleware para parsear cuerpos de peticiones en formato JSON
app.use(express.json());

// Middleware para parsear cuerpos de peticiones en formato URL-encoded (como FormData)
app.use(express.urlencoded({ extended: true })); // `extended: true` permite objetos y arrays anidados

const db = require('./conexion'); // Importa tu archivo de conexi\u00f3n a la base de datos

// Middleware de registro para todas las solicitudes (para ver en consola)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// --- Rutas de la API ---
// Importa cada archivo de rutas que crear\u00e1s en la carpeta ./routes
const authRoutes = require('./routes/authRoutes'); // Para login y auth
const clientesRoutes = require('./routes/clientesRoutes');
const productosRoutes = require('./routes/productosRoutes'); // O inventarioRoutes
const ventasRoutes = require('./routes/ventasRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Montar las rutas bajo el prefijo '/api'
// Las rutas definidas en cada archivo de ruta se acceder\u00e1n con '/api/<prefijo_ruta>'
app.use('/api/auth', authRoutes); // Rutas para /api/auth/... (login)
app.use('/api/clientes', clientesRoutes); // Rutas para /api/clientes/...
app.use('/api/productos', productosRoutes); // Rutas para /api/productos/... (o '/api/inventario')
app.use('/api/ventas', ventasRoutes); // Rutas para /api/ventas/...
app.use('/api/usuarios', usuariosRoutes); // Rutas para /api/usuarios/...
app.use('/api/dashboard', dashboardRoutes);

// Ruta de inicio o prueba para la API (puedes mantenerla o eliminarla si no la usas)
app.get('/api', (req, res) => {
  res.send('API de Nova Salud funcionando correctamente.');
});

// --- Manejo b\u00e1sico de errores (opcional pero recomendado) ---
// Este middleware de error captura errores que ocurren en los middlewares o rutas anteriores
app.use((err, req, res, next) => {
  console.error('Error en el servidor:', err.stack);
  // Evitar enviar una respuesta si ya se envi\u00f3 alguna cabecera (caso de errores manejados antes)
  if (!res.headersSent) {
    res.status(500).send('Algo salió mal en el servidor!');
  }
});

// --- Iniciar el Servidor ---
app.listen(port, () => {
  console.log(`Servidor backend corriendo en http://localhost:${port}`);
  // Opcional: Mensaje de confirmaci\u00f3n de conexi\u00f3n a DB aqu\u00ed si tu 'db' lo permite
  // db.getConnectionStatus();
});