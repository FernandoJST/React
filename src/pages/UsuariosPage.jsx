// src/pages/UsuariosPage.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const USUARIOS_API_ENDPOINT = `${API_BASE_URL}/usuarios`;

const ITEMS_PER_PAGE_USUARIOS = 10;
const TABLE_COLSPAN = 5; // N\u00famero de columnas en la tabla de usuarios

function UsuariosPage() {
    const { token, isLoggedIn, logout } = useContext(AuthContext);

    // --- Estado para los Datos de Usuarios y su Carga/Error ---
    const [usuarios, setUsuarios] = useState([]);
    const [isLoadingUsuarios, setIsLoadingUsuarios] = useState(true);
    const [errorUsuarios, setErrorUsuarios] = useState(null);
    const [currentPageUsuarios, setCurrentPageUsuarios] = useState(1);
    const [totalUsuarios, setTotalUsuarios] = useState(0);
    const [refreshUsuariosTrigger, setRefreshUsuariosTrigger] = useState(0); // Trigger para forzar recarga de usuarios
    const [searchTermUsuarios, setSearchTermUsuarios] = useState('');

    // --- Estado para Modales ---
    const [isUsuarioModalOpen, setIsUsuarioModalOpen] = useState(false);
    const [usuarioModalMode, setUsuarioModalMode] = useState('agregar'); // 'agregar' o 'editar'
    const [editingUserId, setEditingUserId] = useState(null); // ID del usuario editando (null si agregando)

    // --- Estado para el Formulario de Usuario ---
    const [usuarioFormData, setUsuarioFormData] = useState({
        id_usuario: '', // Campo oculto para el ID en modo edición
        nombre_usuario: '',
        contrasena: '',
        rol: 'vendedor', // Default rol
    });
    const [usuarioFormError, setUsuarioFormError] = useState(null); // Errores específicos del formulario
    const [isSavingUsuario, setIsSavingUsuario] = useState(false); // Estado para deshabilitar botón Guardar
    const [isPasswordVisible, setIsPasswordVisible] = useState(false); // Estado para mostrar/ocultar contrase\u00f1a

    // --- Función Genérica de Renderizado de Paginación ---
    const renderPagination = (totalItems, itemsPerPage, currentPage, setCurrentPageFunc) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) {
            return null;
        }

        const buttons = [];
        buttons.push(
            <button key="prev" className="btn-accion-7 pagination-btn-7" disabled={currentPage === 1} onClick={() => setCurrentPageFunc(currentPage - 1)}>
                « Anterior
            </button>
        );
        // Lógica simple para mostrar números de página (ajustada para mostrar un rango)
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

         // Asegurarse de mostrar siempre un rango de 5 p\u00e1ginas si es posible
         if (endPage - startPage < 4) {
             if (startPage === 1) {
                 endPage = Math.min(totalPages, startPage + 4);
             } else if (endPage === totalPages) {
                 startPage = Math.max(1, endPage - 4);
             }
         }


        if (startPage > 1) {
            buttons.push(<button key={1} className="btn-accion-7 pagination-btn-7" onClick={() => setCurrentPageFunc(1)}>1</button>);
            if (startPage > 2) {
                buttons.push(<span key="ellipsis-start" className="pagination-info-7">...</span>);
            }
        }


        for (let i = startPage; i <= endPage; i++) {
            buttons.push(
                <button
                    key={i}
                    className={`btn-accion-7 pagination-btn-7${i === currentPage ? ' active-7 current-page-7' : ''}`}
                    onClick={() => setCurrentPageFunc(i)}
                >
                    {i}
                </button>
            );
        }

         if (endPage < totalPages) {
             if (endPage < totalPages - 1) {
                 buttons.push(<span key="ellipsis-end" className="pagination-info-7">...</span>);
             }
             buttons.push(<button key={totalPages} className="btn-accion-7 pagination-btn-7" onClick={() => setCurrentPageFunc(totalPages)}>{totalPages}</button>);
         }


        buttons.push(
             <button key="next" className="btn-accion-7 pagination-btn-7" disabled={currentPage === totalPages} onClick={() => setCurrentPageFunc(currentPage + 1)}>
                 Siguiente »
             </button>
         );
        return <div className="pagination-controls-7">{buttons}</div>;
    };

    // --- Funciones de Carga de Datos ---

    // Fetch principal de la lista de usuarios (Paginada y con búsqueda)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const fetchUsuarios = useCallback(async () => {
        if (!isLoggedIn || !token) {
            setIsLoadingUsuarios(false);
            setUsuarios([]);
            setTotalUsuarios(0);
            setErrorUsuarios('Debes iniciar sesión para ver los usuarios.');
            return; // Salir si no est\u00e1 logueado
        }

        setIsLoadingUsuarios(true);
        setErrorUsuarios(null); // Limpiar errores previos

        try {
            // Construir URL con parámetros de query para la acción 'listar', paginación y búsqueda
            const queryParams = new URLSearchParams({
                action: 'listar',
                page: currentPageUsuarios,
                limit: ITEMS_PER_PAGE_USUARIOS,
            });

            if (searchTermUsuarios) {
                queryParams.append('search', searchTermUsuarios);
            }

            const url = `${USUARIOS_API_ENDPOINT}?${queryParams.toString()}`;
            console.log('Fetching usuarios:', url);


            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, // <-- Incluir el token en el encabezado
                    'Content-Type': 'application/json', // Aunque es GET, es buena práctica
                },
            });

            // Manejo de errores HTTP (ej: 401 Unauthorized, 403 Forbidden, 500 Internal Server Error)
            if (!response.ok) {
                const errorBody = await response.text(); // Leer cuerpo de la respuesta de error
                console.error('Error fetching usuarios HTTP:', response.status, errorBody);

                // Si es un error de autenticación/autorización, cerrar sesi\u00f3n
                if (response.status === 401 || response.status === 403) {
                    console.error('API returned 401/403 on fetching users. Logging out.');
                    if(logout) logout(); // Llamar a logout si no autorizado
                    setErrorUsuarios('Sesión expirada o no autorizado para ver usuarios.');
                    setIsLoadingUsuarios(false); // Detener carga
                    setUsuarios([]); // Limpiar datos
                    setTotalUsuarios(0);
                    return; // Salir para no procesar como JSON
                }

                // Para otros errores HTTP, intentar obtener un mensaje del cuerpo o usar el estado
                let errorMessage = `Error al cargar usuarios: ${response.status}`;
                try {
                    const errorJson = JSON.parse(errorBody);
                    if(errorJson && errorJson.message) {
                        errorMessage = `Error de API: ${errorJson.message}`; // Usar mensaje de error del backend
                    } else {
                        // Si el error no tiene el formato esperado, usar el estado HTTP y parte del cuerpo
                         errorMessage = `Error al cargar usuarios: ${response.status} - ${errorBody.substring(0, 100)}...`;
                    }
                } catch(e) {
                    // Si el cuerpo no es JSON, usar el estado HTTP y parte del cuerpo
                     errorMessage = `Error al cargar usuarios: ${response.status} - ${errorBody.substring(0, 100)}...`;
                }

                 // Lanzar el error para ser capturado por el catch
                 throw new Error(errorMessage);

            }

            // --- Procesar respuesta JSON exitosa ---
            const result = await response.json();

            // Verificar el formato de la respuesta esperada del backend
            if (!result || typeof result.success === 'undefined' || !result.success || typeof result.total === 'undefined' || !Array.isArray(result.data)) {
                const apiErrorMessage = result?.message || 'Formato de respuesta de usuarios incorrecto o API reportó error.';
                console.error('API error fetching usuarios:', apiErrorMessage, result);
                 // Mostrar error si el formato de la respuesta no es el esperado
                setErrorUsuarios(apiErrorMessage);
                setUsuarios([]); // Limpiar datos si el formato es incorrecto
                setTotalUsuarios(0);
            } else {
                // Si la respuesta es exitosa y con el formato correcto
                setUsuarios(result.data); // Actualizar la lista de usuarios
                setTotalUsuarios(result.total); // Actualizar el total para la paginación

                // Lógica para volver a la página anterior si la actual queda vacía después de eliminar/filtrar
                // Se recalcula el total de páginas basado en el NUEVO total y el límite
                const totalPagesAfterFetch = Math.ceil(result.total / ITEMS_PER_PAGE_USUARIOS);
                // Si la página actual es mayor que el total de páginas calculadas, y el total de usuarios es mayor que 0 (para evitar bucle infinito con 0 usuarios)
                if (currentPageUsuarios > totalPagesAfterFetch && result.total > 0) {
                    // Ir a la última página válida
                    setCurrentPageUsuarios(totalPagesAfterFetch > 0 ? totalPagesAfterFetch : 1);
                } else if (currentPageUsuarios > 1 && result.total === 0) {
                    // Si estamos en una página > 1 pero el total de productos es 0, ir a p\u00e1gina 1
                    setCurrentPageUsuarios(1);
                }
            }


        } catch (fetchError) {
            console.error('Error en la llamada fetch al cargar usuarios (catch):', fetchError);
            // Mostrar error de conexión o inesperado
            setErrorUsuarios(`Error de conexión al cargar usuarios: ${fetchError.message}`);
            setUsuarios([]); // Limpiar datos en caso de error
            setTotalUsuarios(0);
        } finally {
            setIsLoadingUsuarios(false); // Finalizar carga
        }
    }, [currentPageUsuarios, searchTermUsuarios, refreshUsuariosTrigger, token, isLoggedIn, logout]); // Dependencias: paginación, búsqueda, trigger, y estado de autenticación


    // Fetch para obtener los datos de un usuario específico para el modal de edición
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const fetchUsuarioParaEditar = useCallback(async (userId) => {
        if (!isLoggedIn || !token) {
            setUsuarioFormError("Debes iniciar sesi\u00f3n para editar usuarios.");
            return; // Salir si no est\u00e1 logueado
        }

        if (!userId) {
             setUsuarioFormError('ID de usuario no proporcionado para editar.');
             return; // Salir si no hay ID
        }

        setUsuarioFormError(null); // Limpiar errores previos del formulario

        try {
            // Llamada al backend para obtener los datos de un usuario por ID
            const url = `${USUARIOS_API_ENDPOINT}?action=obtener&id=${userId}`;
            console.log('Fetching user for edit:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, // <-- Incluir el token
                    'Content-Type': 'application/json', // Buena práctica
                },
            });

            // Manejo de errores HTTP
            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Error fetching user (ID: ${userId}) for edit HTTP:`, response.status, errorBody);

                // Si es error de autenticación/autorización, cerrar sesi\u00f3n
                if (response.status === 401 || response.status === 403) {
                    console.error('API returned 401/403 on getting user for edit. Logging out.');
                    if(logout) logout();
                     setUsuarioFormError('Sesión expirada o no autorizado para obtener datos del usuario.');
                     closeUsuarioModal(); // Cerrar modal si falla la autenticaci\u00f3n
                     return; // Salir
                }

                // Para otros errores HTTP, intentar obtener un mensaje del cuerpo o usar el estado
                let errorMessage = `Error HTTP al obtener datos del usuario: ${response.status}`;
                 try {
                     const errorJson = JSON.parse(errorBody);
                     if(errorJson && errorJson.message) {
                         errorMessage = errorJson.message; // Usar mensaje de error del backend
                     } else {
                         // Si el error no tiene el formato esperado, usar el estado HTTP y parte del cuerpo
                          errorMessage = `Error HTTP al obtener datos del usuario: ${response.status} - ${errorBody.substring(0, 100)}...`;
                     }
                 } catch(e) {
                      // Si el cuerpo no es JSON, usar el estado HTTP y parte del cuerpo
                       errorMessage = `Error HTTP al obtener datos del usuario: ${response.status} - ${errorBody.substring(0, 100)}...`;
                 }

                 setUsuarioFormError(errorMessage); // Mostrar error en el formulario
                 closeUsuarioModal(); // Cerrar modal al fallar la carga
                 return; // Salir
            }

            // --- Procesar respuesta JSON exitosa ---
            const usuario = await response.json(); // Espera un objeto usuario (sin el campo success/data)

            // Verificar que el objeto recibido tiene la estructura esperada (al menos los campos clave)
            if (!usuario || typeof usuario.id_usuario === 'undefined' || typeof usuario.nombre_usuario === 'undefined' || typeof usuario.rol === 'undefined') {
                const apiErrorMessage = usuario?.message || usuario?.error || `Usuario con ID ${userId} no encontrado o formato incorrecto de datos.`;
                console.error(`API error fetching user (ID: ${userId}) for edit:`, apiErrorMessage, usuario);
                setUsuarioFormError(apiErrorMessage); // Mostrar error en el formulario
                closeUsuarioModal(); // Cerrar modal si el formato es incorrecto
            } else {
                // Si los datos se obtuvieron correctamente, llenar el estado del formulario
                 console.log("Datos de usuario obtenidos para edici\u00f3n:", usuario); // Debugging: verificar datos recibidos

                setUsuarioFormData({
                    id_usuario: usuario.id_usuario || '', // Usar ID del usuario (deber\u00eda existir)
                    nombre_usuario: usuario.nombre_usuario || '', // <-- AQU\u00cd SE ASIGNA EL NOMBRE RECIBIDO
                    contrasena: '', // Siempre vac\u00edo al editar por seguridad
                    rol: usuario.rol || 'vendedor', // Usar rol recibido o default
                });
                // setEditingUserId(usuario.id_usuario); // Esto ya se estableci\u00f3 al abrir el modal

                console.log("Formulario de usuario llenado con:", {
                    id_usuario: usuario.id_usuario,
                    nombre_usuario: usuario.nombre_usuario,
                    rol: usuario.rol,
                }); // Debugging: confirmar que el estado se actualiza
            }

        } catch (fetchError) {
            console.error(`Error al obtener usuario (ID: ${userId}) para editar (catch):`, fetchError);
            // Mostrar error de conexión o inesperado
            setUsuarioFormError(`Error de conexi\u00f3n al cargar datos del usuario: ${fetchError.message}`);
            closeUsuarioModal(); // Cerrar modal en caso de error de conexi\u00f3n
        }
    }, [token, isLoggedIn, logout]); // Dependencias: token, estado de login, logout


    // --- Efectos para Ejecutar las Cargas de Datos ---

    // Efecto principal para cargar usuarios al montar, cambiar p\u00e1gina/b\u00fasqueda o trigger, Y cuando cambie el estado de login/token
    useEffect(() => {
        if (isLoggedIn) { // Solo intentar cargar si est\u00e1 logueado
            fetchUsuarios();
        } else {
            // Limpiar datos si no est\u00e1 logueado
            setUsuarios([]);
            setTotalUsuarios(0);
            setIsLoadingUsuarios(false);
            setErrorUsuarios('Debes iniciar sesión para ver los usuarios.');
        }
    }, [fetchUsuarios, isLoggedIn]); // Dependencia: fetchUsuarios (cambia si cambian sus propias dependencias), y estado de login


    // Efecto para cargar datos del usuario cuando se abre el modal en modo editar y cambia editingUserId
    useEffect(() => {
        if (isUsuarioModalOpen && usuarioModalMode === 'editar' && editingUserId !== null) {
            console.log(`Modal de usuario abierto en modo editar para ID: ${editingUserId}. Cargando datos...`); // Debugging: Confirmar que el useEffect se dispara
            fetchUsuarioParaEditar(editingUserId); // Llama a la funci\u00f3n para obtener datos del usuario
        } else {
            // Cuando el modal se cierra o se abre en modo agregar, limpiar el estado del formulario y editingId
            console.log("Cerrando modal de usuario o abriendo en modo agregar. Reseteando formulario."); // Debugging: Confirmar que el reset se dispara
            setUsuarioFormData({
                id_usuario: '', nombre_usuario: '', contrasena: '', rol: 'vendedor',
            });
            setEditingUserId(null);
            setUsuarioFormError(null);
            setIsSavingUsuario(false);
            setIsPasswordVisible(false); // Resetear visibilidad de contrase\u00f1a
        }
    }, [isUsuarioModalOpen, usuarioModalMode, editingUserId, fetchUsuarioParaEditar]); // Dependencias: estado del modal, modo, id editando, y la funci\u00f3n de fetch


    // --- Manejadores de Modales ---

    const openUsuarioModal = (mode, userId = null) => {
        setUsuarioModalMode(mode);
        setEditingUserId(userId); // Esto disparar\u00e1 el useEffect de carga si el modo es 'editar'

        // Limpiar estado del formulario y errores al abrir
        setUsuarioFormError(null);
        setIsSavingUsuario(false);
        setIsPasswordVisible(false); // Resetear visibilidad de contrase\u00f1a

        // Si abrimos en modo 'agregar', inicializar formulario con valores por defecto.
        // Si abrimos en modo 'editar', el useEffect se encargar\u00e1 de cargar los datos.
        if (mode === 'agregar') {
             setUsuarioFormData({
                 id_usuario: '', nombre_usuario: '', contrasena: '', rol: 'vendedor',
             });
        }

         setIsUsuarioModalOpen(true); // Abrir el modal
    };

    const closeUsuarioModal = () => {
        setIsUsuarioModalOpen(false);
        // El useEffect con dependencia en isUsuarioModalOpen a false se encargar\u00e1 de limpiar el estado.
    };

    // --- Manejadores de Cambios en Formularios ---
    const handleUsuarioFormChange = (e) => {
        const { name, value } = e.target;
         // Recortar nombre de usuario si es ese campo
         const newValue = (name === 'nombre_usuario' && value) ? value.trim() : value;

        setUsuarioFormData(prev => ({
            ...prev,
            [name]: newValue,
        }));
         setUsuarioFormError(null); // Limpiar error al cambiar el formulario
    };

    const handleTogglePasswordVisibility = () => {
        setIsPasswordVisible(prev => !prev);
    };

    // --- Manejadores de Acciones (Guardar, Eliminar) ---

    // Guardar Usuario (Agregar o Actualizar)
    const handleUsuarioFormSubmit = async (event) => {
        event.preventDefault();

        if (!isLoggedIn || !token) {
             console.warn("Attempted to save user without being logged in.");
             if(logout) logout(); // Llamar a logout si no autenticado
             setIsSavingUsuario(false);
             return; // Salir
        }

        setIsSavingUsuario(true);
        setUsuarioFormError(null); // Limpiar errores específicos del formulario

        // Validaciones básicas del lado del cliente antes de enviar
        const action = usuarioModalMode === 'agregar' ? 'agregar' : 'actualizar';
        const { nombre_usuario, contrasena, rol } = usuarioFormData;
        const errors = [];

        if (!nombre_usuario.trim()) errors.push('Nombre de usuario es requerido.');
        // Contrase\u00f1a es requerida solo al agregar, o si se proporciona una nueva al actualizar
        if (action === 'agregar' && !contrasena) errors.push('Contraseña es requerida para nuevos usuarios.');
        // Validar rol
        const allowedRoles = ['admin', 'vendedor'];
        if (!rol || !allowedRoles.includes(rol)) errors.push('Rol es requerido y debe ser "admin" o "vendedor".');

        if (errors.length > 0) {
            setUsuarioFormError('Datos inválidos: ' + errors.join(' '));
            setIsSavingUsuario(false);
            return; // Salir
        }

        try {
            // Preparar datos a enviar
            const dataToSend = {
                action: action,
                ...(action === 'actualizar' && { id_usuario: parseInt(usuarioFormData.id_usuario) }), // Incluir ID solo si es actualizar
                nombre_usuario: nombre_usuario.trim(), // Enviar nombre recortado
                rol: rol, // Enviar rol
                // Incluir contrase\u00f1a solo si se proporcion\u00f3 (al agregar o si se cambi\u00f3 al actualizar)
                ...(contrasena && { contrasena: contrasena }),
            };

            console.log(`Datos de usuario a enviar para ${action}:`, dataToSend);
            console.log(`Sending POST request to: ${USUARIOS_API_ENDPOINT}`);

            // Realizar la petición POST
            const response = await fetch(USUARIOS_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // <-- Incluir el token
                },
                body: JSON.stringify(dataToSend), // Enviar datos como JSON
            });

            // Manejo de errores HTTP
            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error(`Error HTTP ${response.status} during user ${action}:`, errorBody);

                 // Si es error de autenticación/autorización, cerrar sesi\u00f3n
                 if (response.status === 401 || response.status === 403) {
                     console.error('API returned 401/403 on saving user. Logging out.');
                     if(logout) logout(); // Llamar a logout si no autorizado
                     setUsuarioFormError('Sesión expirada o no autorizado para guardar usuario.');
                     setIsSavingUsuario(false); // Detener estado de guardado
                     return; // Salir
                 }

                  // Para otros errores HTTP, intentar obtener un mensaje del cuerpo o usar el estado
                  let errorMessage = `Error al ${action === 'agregar' ? 'agregar' : 'actualizar'} usuario: ${response.status}`;
                   try {
                       const errorJson = JSON.parse(errorBody);
                       if (errorJson && errorJson.message) {
                           errorMessage = errorJson.message; // Usar mensaje de error del backend
                       } else {
                           // Si el error no tiene el formato esperado, usar el estado HTTP y parte del cuerpo
                            errorMessage = `Error al ${action === 'agregar' ? 'agregar' : 'actualizar'} usuario: ${response.status} - ${errorBody.substring(0, 100)}...`;
                       }
                   } catch (e) {
                       // Si el cuerpo no es JSON, usar el estado HTTP y parte del cuerpo
                        errorMessage = `Error al ${action === 'agregar' ? 'agregar' : 'actualizar'} usuario: ${response.status} - ${errorBody.substring(0, 100)}...`;
                   }

                 setUsuarioFormError(errorMessage); // Mostrar error en el formulario
                 setIsSavingUsuario(false); // Detener estado de guardado
                 return; // Salir
            }

            // --- Procesar respuesta JSON exitosa ---
            const result = await response.json();

            if (result.success) {
                // showNotification(result.message || `Usuario ${action === 'agregar' ? 'agregado' : 'actualizado'} exitosamente.`, 'success'); // Notificaci\u00f3n global
                closeUsuarioModal(); // Cerrar modal

                // Después de agregar o actualizar, forzar una recarga de la lista principal
                if(action === 'agregar') {
                    setCurrentPageUsuarios(1); // Opcional: ir a la primera p\u00e1gina para ver el nuevo usuario
                } else {
                     // Trigger para recargar la lista (usado principalmente al actualizar o eliminar en la p\u00e1gina actual)
                     setRefreshUsuariosTrigger(prev => prev + 1);
                }


            } else {
                console.warn(`API reported error during user ${action}:`, result.message);
                setUsuarioFormError(result.message || `Error al ${action} el usuario.`); // Mostrar error del backend en el formulario
                // showNotification(result.message || `Error al ${action} el usuario.`, 'error'); // Notificaci\u00f3n global
            }

        } catch (fetchError) {
            console.error(`Workspace error during user ${action} (catch):`, fetchError);
            setUsuarioFormError(`Error de conexi\u00f3n: ${fetchError.message}. Intente m\u00e1s tarde.`); // Mostrar error de conexión en el formulario
            // showNotification(`Error de conexi\u00f3n: ${fetchError.message}.`, 'error'); // Notificaci\u00f3n global
        } finally {
            setIsSavingUsuario(false); // Finalizar estado de guardado
        }
    };

    // Eliminar Usuario
    const handleDeleteUsuario = async (userId) => {
        if (!isLoggedIn || !token) {
             console.warn("Attempted to delete user without being logged in.");
             if(logout) logout(); // Llamar a logout si no autenticado
             return; // Salir
        }

        setErrorUsuarios(null); // Limpiar errores de la tabla principal antes de la operaci\u00f3n

        try {
            // Preparar datos a enviar para la eliminación
            const dataToSend = {
                 action: 'eliminar',
                 id_usuario: parseInt(userId), // Asegurar que el ID sea un n\u00famero
            };
            console.log(`Deleting user ID: ${userId}`);
             console.log(`Sending POST request to: ${USUARIOS_API_ENDPOINT} with payload:`, dataToSend);

             // Realizar la petición POST para eliminar
             const response = await fetch(USUARIOS_API_ENDPOINT, {
                 method: 'POST',
                 headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`, // <-- Incluir el token
                 },
                 body: JSON.stringify(dataToSend), // Enviar datos como JSON
            });

            // Manejo de errores HTTP
            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error(`Error HTTP ${response.status} during user deletion (ID: ${userId}):`, errorBody);

                 // Si es error de autenticación/autorización, cerrar sesi\u00f3n
                 if (response.status === 401 || response.status === 403) {
                     console.error('API returned 401/403 on deleting user. Logging out.');
                     if(logout) logout();
                     setErrorUsuarios('Sesión expirada o no autorizado para eliminar usuario.'); // Mostrar error en la tabla
                     return; // Salir
                 }

                 // Para otros errores HTTP, intentar obtener un mensaje del cuerpo o usar el estado
                 let errorMessage = `Error al eliminar usuario: ${response.status}`;
                  try {
                      const errorJson = JSON.parse(errorBody);
                      if(errorJson && errorJson.message) {
                          errorMessage = errorJson.message; // Usar mensaje de error del backend
                      } else {
                          // Si el error no tiene el formato esperado, usar el estado HTTP y parte del cuerpo
                           errorMessage = `Error al eliminar usuario: ${response.status} - ${errorBody.substring(0, 100)}...`;
                      }
                  } catch(e) {
                       // Si el cuerpo no es JSON, usar el estado HTTP y parte del cuerpo
                        errorMessage = `Error al eliminar usuario: ${response.status} - ${errorBody.substring(0, 100)}...`;
                  }

                 setErrorUsuarios(errorMessage); // Mostrar error en la tabla
                 return; // Salir
            }


            // --- Procesar respuesta JSON exitosa ---
            const result = await response.json();

            if (result.success) {
                // showNotification(result.message || 'Usuario eliminado exitosamente.', 'success'); // Notificaci\u00f3n global

                 // Lógica para ajustar paginación si se elimina el último de la página
                 const totalPagesAfterDelete = Math.ceil((totalUsuarios - 1) / ITEMS_PER_PAGE_USUARIOS);
                 // Si la p\u00e1gina actual es mayor que el total de p\u00e1ginas despu\u00e9s de eliminar, ir a la \u00faltima p\u00e1gina v\u00e1lida
                 // Y si la p\u00e1gina actual es mayor que 1 (para evitar bucle en p\u00e1gina 1 con 0 elementos)
                 if (currentPageUsuarios > totalPagesAfterDelete && currentPageUsuarios > 1) {
                     setCurrentPageUsuarios(totalPagesAfterDelete > 0 ? totalPagesAfterDelete : 1);
                 } else {
                     // Si no es necesario cambiar de p\u00e1gina, simplemente forzar la recarga de la lista actual
                     setRefreshUsuariosTrigger(prev => prev + 1);
                 }


            } else {
                 console.warn(`API reported error during user deletion (ID: ${userId}):`, result.message);
                 setErrorUsuarios(result.message || 'Error al eliminar el usuario.'); // Mostrar error del backend en la tabla
                 // showNotification(result.message || 'Error al eliminar el usuario.', 'error'); // Notificaci\u00f3n global
            }

        } catch (fetchError) {
             console.error(`Workspace error during user deletion (ID: ${userId}) (catch):`, fetchError);
             setErrorUsuarios(`Error de conexi\u00f3n al eliminar usuario: ${fetchError.message}.`); // Mostrar error de conexión en la tabla
             // showNotification(`Error de conexi\u00f3n al eliminar usuario: ${fetchError.message}.`, 'error'); // Notificaci\u00f3n global
        }
     };


    // --- Manejadores de Búsqueda ---
    const handleSearchUsuariosChange = (event) => {
        // Al cambiar el input de búsqueda de usuarios, actualiza el estado y resetea la paginación
        const newSearchTerm = event.target.value;
        setSearchTermUsuarios(newSearchTerm);
        setCurrentPageUsuarios(1); // Resetear a la primera página al buscar
    };

    // --- Manejador para mostrar/ocultar la contrase\u00f1a en el modal ---
     // Ya definida arriba


    // --- JSX: Traducción del HTML ---
    return (
        <main className="container3-7"> {/* Usar className y sufijo -7 */}
            <h2 className="Listado-7">Gestión de Usuarios</h2> {/* Usar className y sufijo -7 */}

            <div className="controls-container-7"> {/* Usar className y sufijo -7 */}
                <div id="search-container-7"> {/* Mantener ID, añadir sufijo -7 */}
                    {/* Input de búsqueda de USUARIOS controlado por estado */}
                    <input
                        type="text"
                        id="search-input-7" // Mantener ID, añadir sufijo -7
                        placeholder="Buscar usuario por nombre de usuario..."
                        value={searchTermUsuarios} // Controlar el valor con el estado
                        onChange={handleSearchUsuariosChange} // Manejar cambios
                    />
                </div>

                <div className="buttons-row-7"> {/* Usar className y sufijo -7 */}
                    {/* Botón para abrir modal Usuario */}
                    <button
                        id="btn-nuevo-usuario-7" // Mantener ID, añadir sufijo -7
                        className="btn-agregar-7" // Usar className y sufijo -7
                        onClick={() => openUsuarioModal('agregar')} // Abrir modal en modo agregar
                    >
                        Agregar Nuevo Usuario
                    </button>
                </div>
                 {/* Mostrar error general de la tabla si existe */}
                 {errorUsuarios && !isLoadingUsuarios && usuarios.length === 0 && (
                     <div className="error-message-7" style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}> {/* Usar className y sufijo -7 */}
                         {errorUsuarios}
                     </div>
                 )}

            </div>

            {/* Tabla de Usuarios */}
            <table id="usuarios-table-7"> {/* Mantener ID, añadir sufijo -7 */}
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre Usuario</th>
                        <th>Contraseña</th> {/* Mostrar la columna, aunque el valor sea oculto */}
                        <th>Rol</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="usuarios-tbody-7"> {/* Mantener ID, añadir sufijo -7 */}
                   {isLoadingUsuarios && ( // Si está cargando usuarios
                        <tr className="empty-table-message-7"> {/* Usar className y sufijo -7 */}
                            <td colSpan={TABLE_COLSPAN} style={{ textAlign: 'center' }}>Cargando usuarios...</td>
                        </tr>
                    )}
                    {/* Removido errorUsuarios de aqu\u00ed para mostrarlo encima de la tabla */}
                    {!isLoadingUsuarios && !errorUsuarios && usuarios.length === 0 && ( // Si no carga, no hay error Y no hay usuarios
                        <tr className="empty-table-message-7"> {/* Usar className y sufijo -7 */}
                            <td colSpan={TABLE_COLSPAN} style={{ textAlign: 'center' }}>No hay usuarios registrados.</td>
                        </tr>
                    )}
                    {/* Si no carga, no hay error Y hay usuarios, mapear y renderizar filas */}
                    {!isLoadingUsuarios && !errorUsuarios && usuarios.length > 0 && (
                        usuarios.map(usuario => (
                            <tr key={usuario.id_usuario}> {/* Usar 'key' única */}
                                <td>{usuario.id_usuario}</td>
                                <td>{usuario.nombre_usuario}</td>
                                <td>********</td> {/* Ocultar la contrase\u00f1a en la lista */}
                                <td>{usuario.rol}</td>
                                <td>
                                    <button
                                        className="btn-accion-7 btn-editar-7" // Usar className y sufijo -7
                                        onClick={() => openUsuarioModal('editar', usuario.id_usuario)} // Abrir modal editar pasando ID
                                    >
                                        Editar
                                    </button>
                                    <button
                                        className="btn-accion-7 btn-eliminar-7" // Usar className y sufijo -7
                                        onClick={() => handleDeleteUsuario(usuario.id_usuario)} // Llamar manejador eliminar
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Controles de Paginación de Usuarios */}
            {renderPagination(totalUsuarios, ITEMS_PER_PAGE_USUARIOS, currentPageUsuarios, setCurrentPageUsuarios)}


            {/* Modal para Agregar/Editar Usuario - Renderizado condicional */}
            {isUsuarioModalOpen && ( // Si isUsuarioModalOpen es true, renderiza el modal
                 <div id="usuario-modal-7" className="modal-7" style={{ display: 'block' }}> {/* Usar className y sufijo -7, y estilo */}
                    <div className="modal-content-7"> {/* Usar className y sufijo -7 */}
                        <span className="close-button-7" onClick={closeUsuarioModal}>&times;</span> {/* Usar className y sufijo -7 y manejador onClick */}
                        <h3 id="modal-title-7">{usuarioModalMode === 'agregar' ? 'Agregar Usuario' : 'Editar Usuario'}</h3> {/* Mantener ID, añadir sufijo -7 */}

                        <form id="usuario-form-7" onSubmit={handleUsuarioFormSubmit}> {/* Mantener ID y usar onSubmit, añadir sufijo -7 */}
                            {/* Input oculto para el ID en modo edición */}
                            {usuarioModalMode === 'editar' && (
                                <input type="hidden" id="id_usuario-7" name="id_usuario" value={usuarioFormData.id_usuario || ''} readOnly /> // Mantener ID, añadir sufijo -7 y usar value del estado, readOnly en edici\u00f3n
                            )}

                            <div>
                                <label htmlFor="nombre_usuario-7">Nombre de Usuario:</label> {/* Usar htmlFor y sufijo -7 */}
                                <input
                                    type="text"
                                    id="nombre_usuario-7" // Mantener ID, añadir sufijo -7
                                    name="nombre_usuario"
                                    required
                                    value={usuarioFormData.nombre_usuario} // Controlar el valor con el estado
                                    onChange={handleUsuarioFormChange} // Manejar cambios
                                     disabled={isSavingUsuario} // Deshabilitar al guardar
                                />
                            </div>

                            <div>
                                <label htmlFor="contrasena-7">Contraseña:</label> {/* Usar htmlFor y sufijo -7 */}
                                <div className="password-container-7"> {/* Usar className y sufijo -7 */}
                                    <input
                                        type={isPasswordVisible ? 'text' : 'password'} // Alternar tipo para mostrar/ocultar
                                        id="contrasena-7" // Mantener ID, añadir sufijo -7
                                        name="contrasena"
                                        required={usuarioModalMode === 'agregar'} // Requerida solo al agregar
                                        value={usuarioFormData.contrasena} // Controlar valor
                                        onChange={handleUsuarioFormChange} // Manejar cambios
                                         disabled={isSavingUsuario} // Deshabilitar al guardar
                                    />
                                    <span
                                         className="toggle-password-7" // Usar className y sufijo -7
                                        onClick={handleTogglePasswordVisibility} // Manejar clic para alternar visibilidad
                                    >
                                         {isPasswordVisible ? '🙈' : '👁️'} {/* Icono visual */}
                                    </span>
                                </div>
                                {/* Mensaje de ayuda para la contrase\u00f1a en modo edici\u00f3n */}
                                {usuarioModalMode === 'editar' && (
                                    <small id="contrasena-help-7" style={{ display: 'block', color: '#666', marginTop: '5px' }}> {/* Mantener ID y estilos, añadir sufijo -7 */}
                                        Dejar vacío para no cambiar la contraseña actual.
                                    </small>
                                )}
                            </div>

                            <div>
                                <label htmlFor="rol-7">Rol:</label> {/* Usar htmlFor y sufijo -7 */}
                                <select
                                    id="rol-7" // Mantener ID, añadir sufijo -7
                                    name="rol"
                                    required
                                    value={usuarioFormData.rol} // Controlar valor
                                    onChange={handleUsuarioFormChange} // Manejar cambios
                                     disabled={isSavingUsuario} // Deshabilitar al guardar
                                >
                                     <option value="vendedor">Vendedor</option> {/* Opciones de rol */}
                                     <option value="admin">Admin</option>
                                </select>
                            </div>

                            {/* Mostrar error del formulario si existe */}
                            {usuarioFormError && (
                                <div className="error-message-7" style={{ color: 'red', marginBottom: '15px' }}> {/* Usar className y sufijo -7 */}
                                    {usuarioFormError}
                                </div>
                            )}

                            <div className="form-buttons-7"> {/* Usar className y sufijo -7 */}
                                {/* Botón Guardar - Deshabilitado al enviar */}
                                <button type="submit" className="btn-accion-7 btn-guardar-7" disabled={isSavingUsuario}> {/* Usar className y sufijo -7 */}
                                    {isSavingUsuario ? 'Guardando...' : 'Guardar'}
                                </button>
                                {/* Botón Cancelar */}
                                <button type="button" className="btn-accion-7 btn-cancelar-7" onClick={closeUsuarioModal} disabled={isSavingUsuario}> {/* Usar className y sufijo -7 */}
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}

export default UsuariosPage;