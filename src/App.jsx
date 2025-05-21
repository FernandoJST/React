// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Importa componentes de página
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ClientesPage from './pages/ClientesPage';
import ProductoPage from './pages/ProductoPage';
import VentasPage from './pages/VentasPage';
import UsuariosPage from './pages/UsuariosPage';

// Importa layout
import Menu from './components/menu/Menu';
import Footer from './components/footer/Footer';

// Componente Layout
function Layout() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <>
      {!isLoginPage && <Menu />}
      {!isLoginPage && <div style={{ height: '150px' }}></div>}

      <div className="content-wrapper">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/clientes" element={<ProtectedRoute element={ClientesPage} />} />
          <Route path="/productos" element={<ProtectedRoute element={ProductoPage} />} />
          <Route path="/ventas" element={<ProtectedRoute element={VentasPage} />} />
          <Route path="/usuarios" element={<ProtectedRoute element={UsuariosPage} />} />
          <Route path="*" element={<div>404 Página no encontrada</div>} />
        </Routes>
      </div>
      {!isLoginPage && <div style={{ height: '10px' }}></div>}
      {!isLoginPage && <Footer />}
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </Router>
  );
}

export default App;
