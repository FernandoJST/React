// src/components/Auth/ProtectedRoute.js
import React, { useContext } from 'react';
// MODIFICACIÓN 1: Elimina 'Route' de la importación, ya que no se usa en este archivo
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ element: Element, ...rest }) => {
    // MODIFICACIÓN 2: Usa 'isLoggedIn' (que tu AuthContext provee) en lugar de 'isAuthenticated'
    const { isLoggedIn, isLoadingAuth } = useContext(AuthContext);

    // Opcional pero recomendado: muestra algo mientras se carga el estado de autenticación
    if (isLoadingAuth) {
        return <div>Cargando autenticación...</div>; // O cualquier indicador de carga
    }

    // Si el usuario NO está logueado, redirige a la página de login
    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    // Si está logueado, renderiza el componente de la página que se pasó como 'element'
    // Los ...rest props pueden ser útiles para pasar props adicionales si es necesario
    return <Element {...rest} />;
};

export default ProtectedRoute;