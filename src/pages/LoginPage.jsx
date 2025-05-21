// src/pages/LoginPage.js
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const { login, isLoggedIn } = useContext(AuthContext);

    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn) {
            navigate('/');
        }
    }, [isLoggedIn, navigate]);

    const handleLoginSubmit = async (event) => {
        event.preventDefault();

        // Obtener la URL base de la API
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
        console.log('URL de API que se está usando:', API_BASE_URL);

        setIsSubmitting(true);
        setError(null);

        const dataToSend = {
            nombre_usuario: username,
            contrasena: password
        };

        try {
            console.log('Enviando solicitud a:', `${API_BASE_URL}/auth/login`);
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSend)
            });

            console.log('Respuesta recibida. Status:', response.status);

            // Intentar leer el cuerpo de la respuesta
            const responseText = await response.text();
            console.log('Respuesta en texto:', responseText);

            let responseData;
            try {
                // Intentar parsear como JSON
                responseData = JSON.parse(responseText);
                console.log('Datos de respuesta JSON:', responseData);
            } catch (jsonError) {
                console.error('Error al parsear respuesta como JSON:', jsonError);
                throw new Error('La respuesta del servidor no es JSON válido');
            }

            // Verificar si la respuesta indica éxito
            if (responseData.success) {
                console.log('Login exitoso, datos del usuario:', responseData.user);
                // Llama a la funci\u00f3n login del contexto y P\u00c1SALE EL TOKEN
                login({
                    id_usuario: responseData.user.id_usuario,
                    username: responseData.user.username,
                    role: responseData.user.role,
                    token: responseData.token // <--- Aseg\u00farate de que el backend env\u00ede 'token' en la respuesta exitosa y p\u00e1salo aqu\u00ed
                });
                // Ahora navega despu\u00e9s de que el contexto ha actualizado el estado
                navigate('/'); // <--- ESTA L\u00d3GICA DE REDIRECCI\u00d3N EST\u00c1 CORRECTAMENTE AQU\u00cd
            } else {
                setError(responseData.message || 'Error de autenticación');
            }

        } catch (err) {
            console.error('Error completo:', err);
            setError('No se pudo conectar con el servidor. Verifica tu conexión y que el servidor esté funcionando.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoggedIn) {
        return null;
    }

    return (
        <main className="login-page-content">
            <div className="login-container">
                <div className="login-logo">
                    <Link to="/" className="logo-link" aria-label="Página principal">
                        <div className="logo">::</div>
                        <h1 className="header-title">Clínica</h1>
                    </Link>
                </div>

                <h2 className="login-subtitle">Acceso al Sistema</h2>

                <form onSubmit={handleLoginSubmit} id="login-form">
                    <div className="form-group">
                        <label htmlFor="username">
                            <i className="fas fa-user"></i> Usuario:
                        </label>
                        <input
                            type="text"
                            id="username"
                            name="usuario"
                            placeholder="Ingrese su usuario"
                            required
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            <i className="fas fa-lock"></i> Contraseña:
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="contrasena"
                            placeholder="Ingrese su contraseña"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="error-message" id="login-error" role="alert" aria-live="assertive">
                            <i className="fas fa-exclamation-triangle"></i>
                            <span id="error-text">{error}</span>
                        </div>
                    )}

                    <button type="submit" id="login-button" disabled={isSubmitting}>
                        <span className="button-icon"><i className="fas fa-sign-in-alt"></i></span>
                        <span className="button-text">{isSubmitting ? 'Ingresando...' : 'Ingresar'}</span>
                    </button>
                </form>
            </div>
        </main>
    );
}

export default LoginPage;