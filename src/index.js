// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client'; // Importación para React 18+
import './styles/styles.css'; // Importa tu archivo CSS global
import './styles/styles1.css'; // Importa tu otro archivo CSS global si aplica
import App from './App'; // Importa el componente principal App
// Si usas otros estilos CSS, impórtalos aquí o en App.js según su ámbito

// Encuentra el elemento raíz en public/index.html
const container = document.getElementById('root');

// Crea una raíz de renderizado (para React 18+)
const root = ReactDOM.createRoot(container);

// Renderiza la aplicación principal dentro de React.StrictMode
root.render(
  <React.StrictMode>
    <App /> {/* Aquí se renderiza tu componente App y toda su estructura */}
  </React.StrictMode>
);
