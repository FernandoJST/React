// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. Crear el Contexto
export const AuthContext = createContext();

// Hook personalizado para usar el contexto f\u00e1cilmente
export const useAuth = () => useContext(AuthContext);

// 2. Crear el Proveedor del Contexto
export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();

    // Estado para almacenar la informaci\u00f3n de autenticaci\u00f3n
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [idUsuario, setIdUsuario] = useState(null);
    const [username, setUsername] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [token, setToken] = useState(null); // <-- A\u00f1adido estado para el token
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    // Efecto para cargar el estado de sessionStorage al iniciar la app
    useEffect(() => {
        console.log('AuthContext useEffect: Loading from sessionStorage');
        const storedIsLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        const storedIdUsuario = sessionStorage.getItem('id_usuario') || null;
        const storedUsername = sessionStorage.getItem('username') || null;
        const storedUserRole = sessionStorage.getItem('userRole') || null;
        const storedToken = sessionStorage.getItem('jwt_token') || null; // <-- Leer token

        setIsLoggedIn(storedIsLoggedIn);
        setIdUsuario(storedIdUsuario);
        setUsername(storedUsername);
        setUserRole(storedUserRole);
        setToken(storedToken); // <-- Establecer token
        setIsLoadingAuth(false);

        console.log('AuthContext useEffect: Loaded state:', { storedIsLoggedIn, storedIdUsuario, storedUsername, storedUserRole, storedToken });

    }, []); // El array vac\u00edo asegura que solo se ejecuta una vez al montar

    // Funci\u00f3n de login (debe recibir el token y otros datos del usuario)
    const login = ({ id_usuario, username, role, token }) => { // <-- RECIBE DATOS Y TOKEN AQU\u00cd
        console.log('AuthContext: Login successful, setting state and storage');
        // Guardar en sessionStorage
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('id_usuario', id_usuario);
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('userRole', role);
        sessionStorage.setItem('jwt_token', token); // <-- GUARDA EL TOKEN AQU\u00cd

        // Actualizar estado del contexto
        setIsLoggedIn(true);
        setIdUsuario(id_usuario);
        setUsername(username);
        setUserRole(role);
        setToken(token); // <-- Establecer token en el estado local

        console.log('AuthContext: State updated.');
        // La navegaci\u00f3n DEBE hacerse en LoginPage despu\u00e9s de llamar a esta funci\u00f3n
    };

    // Funci\u00f3n de logout
    const logout = () => {
        console.log('AuthContext: Logging out...');

        // Limpiar sessionStorage y actualizar estado
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('id_usuario');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('jwt_token'); // <-- LIMPIA EL TOKEN AQU\u00cd

        setIsLoggedIn(false);
        setIdUsuario(null);
        setUsername(null);
        setUserRole(null);
        setToken(null); // <-- Limpiar token del estado local

        console.log('AuthContext: State updated to logged out.');

        // Redirigir al login despu\u00e9s de cerrar sesi\u00f3n
        navigate('/login'); // <-- La redirecci\u00f3n en logout est\u00e1 aqu\u00ed
    };

    // El valor que provee el contexto a los componentes hijos
    const contextValue = {
        isLoggedIn,
        idUsuario,
        username,
        userRole,
        token, // <-- INCLUYE EL TOKEN EN EL VALOR DEL CONTEXTO
        isLoadingAuth, // Estado para saber si el estado de auth est\u00e1 cargando (desde sessionStorage)
        login,
        logout
    };

    // Proveer el contexto a los componentes hijos
    return (
        <AuthContext.Provider value={contextValue}>
            {
                // Renderiza solo despu\u00e9s de cargar el estado inicial de sessionStorage
                isLoadingAuth
                    ? <div>Cargando autenticación...</div> // Puedes poner un spinner o pantalla de carga
                    : children // Renderiza los componentes hijos (tu aplicaci\u00f3n) una vez cargado
            }
        </AuthContext.Provider>
    );
};