// src/pages/HomePage.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function HomePage() {
    const [dashboardData, setDashboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const { username, isLoggedIn, token, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const fetchDashboardData = useCallback(async () => {
        if (!isLoggedIn || !token) {
            console.log("No logueado o sin token, no se cargan datos del dashboard.");
            setIsLoading(false);
            setDashboardData(null);
            // No establecemos error aqu\u00ed porque el mensaje "Debes iniciar sesi\u00f3n" se maneja abajo o por ProtectedRoute
            return;
        }

        setIsLoading(true); // Iniciar estado de carga
        setError(null); // Limpiar errores anteriores
        setDashboardData(null); // Limpiar datos viejos mientras carga

        console.log('Fetching dashboard data with token:', token);

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log('Dashboard API response status:', response.status);

            if (!response.ok) {
                // --- MANEJO DE ERRORES CORREGIDO: Leer el cuerpo una sola vez ---
                const errorBodyText = await response.text(); // Leer el cuerpo como texto primero
                console.error('Error fetching dashboard data HTTP:', response.status, errorBodyText);

                let errorMessage = `Error al cargar datos del dashboard: ${response.status}`;

                try {
                    // Intentar parsear el texto le\u00eddo como JSON
                    const errorData = JSON.parse(errorBodyText);
                    errorMessage = errorData.message || errorMessage; // Usar el mensaje del backend si existe
                } catch (parseError) {
                    // Si el parseo falla (el cuerpo no es JSON), usar el texto plano como mensaje
                    errorMessage = errorBodyText || errorMessage;
                }

                if (response.status === 401 || response.status === 403) {
                    console.error('API returned 401/403 on dashboard fetch. Logging out.');
                    if (logout) logout();
                    setError('Sesión expirada o no tienes permisos. Por favor, inicia sesión de nuevo.');
                } else {
                    // Para otros errores, establecer el mensaje obtenido (ya sea del JSON o texto plano)
                    setError(`Error del servidor: ${errorMessage}`);
                }
                setDashboardData(null);
            } else {
                // --- RESPUESTA OK: Leer el cuerpo como JSON ---
                const data = await response.json();
                console.log('Dashboard data received:', data);

                if (data.success) {
                    console.log('Dashboard data fetched successfully:', data);
                    setDashboardData(data);

                    const productosUrgentesCount = data.stats?.productos_por_agotarse_count || 0;
                    if (productosUrgentesCount > 0) {
                        // Implementar notificaci\u00f3n aqu\u00ed si es necesario
                    }
                } else {
                    console.error('API reported error (success: false):', data.message);
                    setError(`Error del servidor: ${data.message || 'Error desconocido.'}`);
                    setDashboardData(null);
                }
            }
        } catch (fetchError) {
            console.error('Fetch error (catch):', fetchError);
            setError(`Error de conexión con el servidor: ${fetchError.message || 'Error desconocido'}`);
            setDashboardData(null);
        } finally {
            setIsLoading(false);
        }
    }, [isLoggedIn, token, logout]);

    useEffect(() => {
        if (isLoggedIn) {
            console.log("Usuario logueado, cargando datos del dashboard...");
            fetchDashboardData();
        } else {
            console.log("Usuario deslogueado, no se cargan datos del dashboard.");
            setIsLoading(false);
            setDashboardData(null);
            setError('Debes iniciar sesión para ver el dashboard.');
        }
    }, [fetchDashboardData, isLoggedIn]);

    const getGreeting = () => {
        const hora = new Date().getHours();
        let greeting = '';
        if (hora < 12) {
            greeting = 'Buenos días';
        } else if (hora < 18) {
            greeting = 'Buenas tardes';
        } else {
            greeting = 'Buenas noches';
        }
        return `${greeting}${isLoggedIn && username ? ', ' + username : ''}`;
    };

    const renderLowStockTableRows = () => {
        if (isLoading) {
            return (
                <tr key="loading-low-stock">
                    <td colSpan="3" style={{ textAlign: 'center' }}>Cargando productos...</td>
                </tr>
            );
        }

        if (error) {
            return (
                <tr key="error-low-stock">
                    <td colSpan="3" style={{ textAlign: 'center', color: 'red' }}>Error al cargar productos: {error}</td>
                </tr>
            );
        }

        if (!dashboardData || !dashboardData.low_stock_products || dashboardData.low_stock_products.length === 0) {
            const message = isLoggedIn ? 'No hay productos con bajo stock.' : 'Debes iniciar sesión para ver productos.';
            return (
                <tr key="no-low-stock">
                    <td colSpan="3" style={{ textAlign: 'center' }}>{message}</td>
                </tr>
            );
        }

        return dashboardData.low_stock_products.map(product => {
            const stock = parseInt(product.stock);
            const status = stock <= 5 ? 'danger' : 'warning';
            const statusText = stock <= 5 ? 'Urgente' : 'Por agotar';

            return (
                <tr key={product.id_producto}>
                    <td>{product.nombre}</td>
                    <td>{stock}</td>
                    <td><span className={`badge badge-${status}`}>{statusText}</span></td>
                </tr>
            );
        });
    };

    // --- Lógica para Renderizar la Lista de Actividades Recientes ---
    const renderActivityListItems = () => {
        if (isLoading) {
            return (
                <li key="loading-activities" className="activity-item">
                    <div className="activity-content"><div className="activity-title">Cargando actividades...</div></div>
                </li>
            );
        }

        if (error) {
            return (
                <li key="error-activities" className="activity-item">
                    <div className="activity-content"><div className="activity-title" style={{ color: 'red' }}>Error al cargar actividades: {error}</div></div>
                </li>
            );
        }

        // Verificar si hay datos y si la lista de actividades recientes no est\u00e1 vac\u00eda
        if (!dashboardData || !dashboardData.recent_activities || dashboardData.recent_activities.length === 0) {
            const message = isLoggedIn ? 'No hay actividades recientes.' : 'Debes iniciar sesión para ver actividades.';
            return (
                <li>
                    <div className="activity-content"><div className="activity-title">{message}</div></div>
                </li>
            );
        }

        // Mapear datos a elementos de lista, LIMITANDO A LOS PRIMEROS 4
        return dashboardData.recent_activities
            .slice(0, 4) // <--- APLICAMOS slice(0, 4) AQU\u00cd para tomar solo los primeros 4 elementos
            .map((activity, index) => {
                // Usar un ID de la actividad si existe, de lo contrario usar index con precauci\u00f3n
                const key = activity.id || `activity-${index}`;

                let iconClass = '';
                let iconUse = '';

                if (activity.type === 'sale') {
                    iconClass = 'sale';
                    iconUse = '#icon-sale';
                } else if (activity.type === 'client') {
                    iconClass = 'client';
                    iconUse = '#icon-client';
                } else if (activity.type === 'inventory') {
                    iconClass = 'inventory';
                    iconUse = '#icon-inventory';
                }
                // A\u00f1adir otros tipos si existen y mapearlos a sus iconos

                return (
                    <li key={key} className="activity-item">
                        <div className={`activity-icon ${iconClass}`}>
                            <svg className="icon" aria-hidden="true"><use xlinkHref={iconUse}></use></svg>
                        </div>
                        <div className="activity-content">
                            <div className="activity-title">{activity.description || 'Sin descripción'}</div>
                            <div className="activity-meta">{activity.time ? new Date(activity.time).toLocaleString() : 'Fecha/Hora desconocida'}</div>
                        </div>
                    </li>
                );
            });
    };

    const svgSymbols = (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <symbol id="icon-sale" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" /></symbol>
            <symbol id="icon-inventory" viewBox="0 0 24 24"><path fill="currentColor" d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V8h16v10zm-2-7h-4v4h4v-4z" /></symbol>
            <symbol id="icon-client" viewBox="0 0 24 24"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></symbol>
            <symbol id="icon-add-sale" viewBox="0 0 24 24"><path fill="currentColor" d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></symbol>
            <symbol id="icon-add-product" viewBox="0 0 24 24"><path fill="currentColor" d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" /></symbol>
            <symbol id="icon-add-client" viewBox="0 0 24 24"><path fill="currentColor" d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></symbol>
        </svg>
    );

    return (
        <main className="dashboard-content">
            {!isLoggedIn ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <h2>Por favor, inicia sesión para ver el dashboard.</h2>
                    <button onClick={() => navigate('/login')} className="auth-button login-btn" style={{ marginTop: '20px' }}>
                        Ir a Iniciar Sesión
                    </button>
                </div>
            ) : (
                <>
                    <div className="contentr">
                        <h1>Bienvenido a Clínica</h1>
                        <p className="saludo-usuario">{getGreeting()}</p>
                    </div>

                    <div className="container2">
                        <section className="stats-container">
                            <div className="stat-card primary">
                                <div className="stat-title">VENTAS DEL DÍA</div>
                                <div className="stat-value">
                                    {isLoading ? 'Cargando...' : error ? 'Error' : `S/. ${parseFloat(dashboardData?.stats?.total_ventas_dia || 0).toFixed(2)}`}
                                </div>
                                <div className={`stat-trend ${!isLoading && !error && (parseFloat(dashboardData?.stats?.total_ventas_dia) || 0) > 0 ? 'positive' : ''}`}>
                                    {!isLoading && !error ? ((parseFloat(dashboardData?.stats?.total_ventas_dia) || 0) > 0 ? 'Datos disponibles' : 'Sin datos') : ''}
                                </div>
                            </div>

                            <div className="stat-card success">
                                <div className="stat-title">PRODUCTOS VENDIDOS</div>
                                <div className="stat-value">
                                    {isLoading ? 'Cargando...' : error ? 'Error' : (parseInt(dashboardData?.stats?.total_productos_vendidos) || 0)}
                                </div>
                                <div className={`stat-trend ${!isLoading && !error && (parseInt(dashboardData?.stats?.total_productos_vendidos) || 0) > 0 ? 'positive' : ''}`}>
                                    {!isLoading && !error ? ((parseInt(dashboardData?.stats?.total_productos_vendidos) || 0) > 0 ? 'Datos disponibles' : 'Sin datos') : ''}
                                </div>
                            </div>

                            <div className="stat-card warning">
                                <div className="stat-title">CLIENTES ATENDIDOS</div>
                                <div className="stat-value">
                                    {isLoading ? 'Cargando...' : error ? 'Error' : (parseInt(dashboardData?.stats?.total_clientes_atendidos) || 0)}
                                </div>
                                <div className={`stat-trend ${!isLoading && !error && (parseInt(dashboardData?.stats?.total_clientes_atendidos) || 0) > 0 ? 'positive' : ''}`}>
                                    {!isLoading && !error ? ((parseInt(dashboardData?.stats?.total_clientes_atendidos) || 0) > 0 ? 'Datos disponibles' : 'Sin datos') : ''}
                                </div>
                            </div>

                            <div className="stat-card danger">
                                <div className="stat-title">PRODUCTOS POR AGOTARSE</div>
                                <div className="stat-value">
                                    {isLoading ? 'Cargando...' : error ? 'Error' : (parseInt(dashboardData?.stats?.productos_por_agotarse_count) || 0)}
                                </div>
                                <div className="stat-trend">
                                    <span className={`badge badge-${(isLoading || error || (parseInt(dashboardData?.stats?.productos_por_agotarse_count) || 0)) <= 0 ? 'success' : 'warning'}`}>
                                        {(isLoading || error) ? '' : ((parseInt(dashboardData?.stats?.productos_por_agotarse_count) || 0) > 0 ? 'Alerta' : 'OK')}
                                    </span>
                                </div>
                            </div>
                        </section>

                        <section className="main-content-panels">
                            <div className="panel">
                                <div className="panel-header">
                                    <h2 className="panel-title">Productos bajos en stock</h2>
                                    <div className="panel-actions">
                                        <Link to="/productos">Ver todos</Link>
                                    </div>
                                </div>
                                <div className="panel-body">
                                    <table className="stock-table">
                                        <thead>
                                            <tr>
                                                <th>Producto</th>
                                                <th>Stock</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {renderLowStockTableRows()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="panel">
                                <div className="panel-header">
                                    <h2 className="panel-title">Actividades recientes</h2>
                                </div>
                                <div className="panel-body">
                                    <ul className="activity-list">
                                        {renderActivityListItems()}
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section className="quick-actions">
                            <Link to="/ventas" className="action-card">
                                <div className="action-icon">
                                    <svg className="icon" aria-hidden="true"><use xlinkHref="#icon-add-sale"></use></svg>
                                </div>
                                <h3 className="action-title">Registrar venta</h3>
                                <p className="action-description">Accede rápidamente al formulario de venta.</p>
                            </Link>

                            <Link to="/productos" className="action-card">
                                <div className="action-icon">
                                    <svg className="icon" aria-hidden="true"><use xlinkHref="#icon-add-product"></use></svg>
                                </div>
                                <h3 className="action-title">Añadir producto</h3>
                                <p className="action-description">Crea un nuevo producto en el inventario.</p>
                            </Link>

                            <Link to="/clientes" className="action-card">
                                <div className="action-icon">
                                    <svg className="icon" aria-hidden="true"><use xlinkHref="#icon-add-client"></use></svg>
                                </div>
                                <h3 className="action-title">Registrar cliente</h3>
                                <p className="action-description">Añade un nuevo cliente a la base de datos.</p>
                            </Link>
                        </section>

                        {svgSymbols}
                    </div>
                </>
            )}
        </main>
    );
}

export default HomePage;