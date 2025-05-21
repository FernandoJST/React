// src/components/menu/Menu.js
import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Suponiendo que has creado un contexto para la autenticación
import { AuthContext } from '../../context/AuthContext';

function Menu() {
    // --- Estado Local para el Menú Móvil y Scroll de la Navbar ---
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // --- Consumir Contexto de Autenticación ---
    // Obtiene el estado del usuario y la función de logout del contexto
    const { isLoggedIn, username, userRole, logout } = useContext(AuthContext);

    const navigate = useNavigate(); // Hook para navegar programáticamente

    // --- Efectos para Manejar Eventos Globales (resize, keydown, scroll) ---
    useEffect(() => {
        // Efecto para cerrar el menú móvil en resize (si pasa a escritorio)
        const handleResize = () => {
            if (window.innerWidth > 768 && isMobileMenuOpen) {
                setIsMobileMenuOpen(false);
                // Posiblemente también limpiar estilos del body si los aplicas al abrir
                document.body.style.overflow = '';
            }
        };

        // Efecto para cerrar el menú móvil con Escape
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && isMobileMenuOpen) {
                setIsMobileMenuOpen(false);
                 document.body.style.overflow = '';
            }
        };

        // Efecto para cambiar clase de la navbar al hacer scroll
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        // Adjuntar listeners al montar el componente
        window.addEventListener('resize', handleResize);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', handleScroll);


        // Limpiar listeners al desmontar el componente (importante para evitar fugas de memoria)
        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isMobileMenuOpen]); // El efecto se re-ejecuta si isMobileMenuOpen cambia

     // Efecto para controlar el overflow del body cuando el menú móvil se abre/cierra
     useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
     }, [isMobileMenuOpen]);


    // --- Manejadores de Eventos ---
    const handleLoginClick = () => {
        navigate('/login'); // Navega a la ruta /login usando React Router
    };

    const handleLogoutClick = () => {
        logout(); // Llama a la función de logout del contexto de autenticación
        // La función logout del contexto probablemente también navegue a /login
    };

     const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    // --- Lógica de Renderizado Condicional ---
    const isAdmin = userRole === 'admin';

    return (
        <> {/* Fragmento para agrupar elementos */}
            {/* Navbar de escritorio - Traducción del <nav> */}
            <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Menú principal">
                <Link to="/" className="logo-link" aria-label="Página principal">
                    <div className="logo">NS</div>
                    <h1 className="header-title">Clínica</h1>
                </Link>

                <ul className="desktop-menu">
                    <li className="menu-item">
                        <Link to="/" className="menu-link">Inicio</Link> {/* Usar Link */}
                    </li>

                    {/* Elementos protegidos - Renderizado condicional basado en isLoggedIn */}
                    {isLoggedIn && (
                        <> {/* Otro fragmento si hay múltiples elementos */}
                            <li className="menu-item protected-item">
                                <Link to="/ventas" className="menu-link">Ventas</Link> {/* Usar Link */}
                            </li>
                            <li className="menu-item protected-item">
                                <Link to="/clientes" className="menu-link">Clientes</Link> {/* Usar Link */}
                            </li>
                             {/* Corregido según tu HTML, este era Inventario */}
                            <li className="menu-item protected-item">
                                 <Link to="/productos" className="menu-link">Inventario</Link> {/* Usar Link */}
                            </li>

                            {/* Elemento de Admin - Renderizado condicional basado en isAdmin */}
                            {isAdmin && (
                                <li className="menu-item protected-item admin-menu-item">
                                    <Link to="/usuarios" className="menu-link">Usuarios</Link> {/* Usar Link */}
                                </li>
                            )}
                        </>
                    )}
                </ul>

                {/* Sección de Autenticación - Renderizado condicional basado en isLoggedIn */}
                <div className="user-auth-section">
                    {/* Mostrar si NO está logueado */}
                    {!isLoggedIn && (
                        <div className="auth-buttons logged-out">
                            {/* Usar onClick y el manejador JS */}
                            <button className="auth-button login-btn" onClick={handleLoginClick}>Iniciar Sesión</button>
                        </div>
                    )}
                     {/* Mostrar si SÍ está logueado */}
                    {isLoggedIn && (
                        <div className="user-info logged-in">
                             {/* Mostrar nombre de usuario del contexto */}
                            <span className="username-display" aria-live="polite">Hola, {username}</span>
                             {/* Usar onClick y el manejador JS */}
                            <button className="auth-button logout-btn" onClick={handleLogoutClick}>Cerrar Sesión</button>
                        </div>
                    )}
                </div>

                {/* Botón para menú móvil - Usar onClick y estado isMobileMenuOpen */}
                <button
                    className={`mobile-menu-btn ${isMobileMenuOpen ? 'active' : ''}`}
                    id="mobileMenuBtn" // Aunque en React los IDs no son tan cruciales, puedes mantenerlos si tu CSS los usa
                    aria-label="Abrir menú móvil"
                    aria-expanded={isMobileMenuOpen} // Reflejar el estado del menú
                    onClick={toggleMobileMenu}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </nav>

            {/* Menú móvil - Traducción del <aside> - Visibilidad controlada por estado */}
            <aside
                className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}
                 id="mobileMenu"
                 aria-hidden={!isMobileMenuOpen}
            >
                <div className="mobile-menu-header">
                    <Link to="/" className="logo-link" aria-label="Página principal" onClick={() => setIsMobileMenuOpen(false)}> {/* Cerrar menú al hacer clic en logo */}
                        <div className="logo">NS</div>
                        <h1 className="header-title">Nova Salud</h1>
                    </Link>
                    {/* Botón para cerrar - Usar onClick y estado */}
                    <button className="close-menu-btn" id="closeMenuBtn" aria-label="Cerrar menú móvil" onClick={() => setIsMobileMenuOpen(false)}>&times;</button>
                </div>

                <ul className="mobile-menu-list">
                     <li className="mobile-menu-item">
                        <Link to="/" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Inicio</Link> {/* Usar Link y cerrar menú al navegar */}
                    </li>

                    {/* Elementos protegidos móviles - Renderizado condicional basado en isLoggedIn */}
                     {isLoggedIn && (
                        <>
                            <li className="mobile-menu-item protected-item">
                                <Link to="/ventas" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Ventas</Link>
                            </li>
                            <li className="mobile-menu-item protected-item">
                                <Link to="/clientes" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Clientes</Link>
                            </li>
                             {/* Corregido según tu HTML */}
                            <li className="mobile-menu-item protected-item">
                                 <Link to="/inventario" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Inventario</Link>
                            </li>

                             {/* Elemento de Admin móvil - Renderizado condicional basado en isAdmin */}
                            {isAdmin && (
                                <li className="mobile-menu-item protected-item admin-menu-item">
                                    <Link to="/usuarios" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Usuarios</Link>
                                </li>
                            )}
                             <li className="mobile-menu-item protected-item">
                                <Link to="/contacto" className="mobile-menu-link" onClick={() => setIsMobileMenuOpen(false)}>Contacto</Link>
                            </li>
                        </>
                    )}
                </ul>

                 {/* Sección de Autenticación móvil - Renderizado condicional basado en isLoggedIn */}
                <div className="mobile-user-auth-section">
                     {!isLoggedIn && (
                        <div className="mobile-auth-buttons logged-out">
                             {/* Usar onClick y el manejador JS */}
                            <button className="mobile-auth-button login-btn" onClick={handleLoginClick}>Iniciar Sesión</button>
                        </div>
                    )}
                    {isLoggedIn && (
                        <div className="mobile-user-info logged-in">
                             {/* Mostrar nombre de usuario del contexto */}
                            <span className="username-display" aria-live="polite">Hola, {username}</span>
                             {/* Usar onClick y el manejador JS */}
                            <button className="mobile-auth-button logout-btn" onClick={handleLogoutClick}>Cerrar Sesión</button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Posible overlay para el menú móvil - Visibilidad controlada por estado */}
             {isMobileMenuOpen && (
                 <div className="menu-overlay" id="menuOverlay" onClick={() => setIsMobileMenuOpen(false)}></div>
             )}
        </>
    );
}

export default Menu;