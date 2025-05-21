// server/conexion.js
const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1', // Cambiamos localhost por 127.0.0.1
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nova_salud',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Añadimos timeout para evitar que se quede esperando indefinidamente
  connectTimeout: 100000, // 10 segundos
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para probar la conexión
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Conexión a la base de datos exitosa (Node.js)!');
    connection.release();
    return true;
  } catch (err) {
    console.error('\n***************************************************');
    console.error('Error al conectar a la base de datos (Node.js):', err.message);
    console.error('Asegúrate de que MySQL/MariaDB de XAMPP esté corriendo');
    console.error('y que las credenciales en server/.env sean correctas.');
    console.error('***************************************************\n');
    return false;
  }
};

// Probar la conexión al inicio
testConnection();

// Exportar el pool para ser usado en otras partes de la aplicación
module.exports = pool;