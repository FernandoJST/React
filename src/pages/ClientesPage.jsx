// src/pages/ClientesPage.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext'; // Importar el contexto de autenticación

const API_BASE_URL = process.env.REACT_APP_API_URL;
const CLIENTES_API_ENDPOINT = `${API_BASE_URL}/clientes`;

function ClientesPage() {
    // Consumir Contexto de Autenticación
    // Necesitas el token para las peticiones a la API y isLoggedIn/logout para manejo de sesión/errores 401
    const { token, isLoggedIn, logout } = useContext(AuthContext); // Asegúrate de que AuthContext provea 'token'

    // Estado para los Datos de Clientes y su Carga/Error
    const [clientes, setClientes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null); // Error para la tabla principal

    // Estado para Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalClientes, setTotalClientes] = useState(0);

    // Estado para Búsqueda
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para el Modal (Agregar/Editar)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('agregar'); // 'agregar' o 'editar'
    const [editingClient, setEditingClient] = useState(null); // Estado para guardar el objeto cliente editando (o null)

    // Estado para el Formulario dentro del Modal
    const [formData, setFormData] = useState({
        id_cliente: '', // Campo oculto para el ID en modo edición
        nombre: '',
        dni: '',
        telefono: '',
        direccion: '',
    });
    const [formError, setFormError] = useState(null); // Estado para errores específicos del formulario
    const [isSaving, setIsSaving] = useState(false); // Estado para deshabilitar botón Guardar

    // --- Función de Carga de Clientes ---
    const fetchClientes = useCallback(async () => {
        // Solo intenta fetchear si est\u00e1 logueado y tienes token
        if (!isLoggedIn || !token) {
            setIsLoading(false);
            setClientes([]);
            setTotalClientes(0);
            return;
        }

        setIsLoading(true);
        setError(null); // Limpiar errores previos de la tabla

        try {
            // Construir la URL de la API con paginaci\u00f3n y b\u00fasqueda
            const queryParams = new URLSearchParams({
                action: 'listar', // Asume que tu backend Node.js sigue usando 'action'
                page: currentPage,
                limit: itemsPerPage,
            });

            if (searchTerm) {
                queryParams.append('search', searchTerm);
            }

            const response = await fetch(`${CLIENTES_API_ENDPOINT}?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, // <--- Envía el token JWT aquí
                    'Content-Type': 'application/json',
                },
            });

            // Manejo de errores HTTP (401, 403, 500, etc.)
            if (response.status === 401 || response.status === 403) {
                console.error('API returned 401/403 on fetching clients. Logging out.');
                // Si es no autorizado, cerrar sesi\u00f3n usando la funci\u00f3n del contexto
                if(logout) logout();
                setError('Sesión expirada o no autorizado para ver clientes.');
                setIsLoading(false);
                return; // Detener procesamiento posterior
            }

            if (!response.ok) {
                 const errorBody = await response.text(); // Leer cuerpo de error gen\u00e9rico
                 console.error('Error fetching clients HTTP:', response.status, errorBody);
                 let errorMessage = `Error al cargar clientes: ${response.status}`;
                 try {
                     const errorJson = JSON.parse(errorBody);
                     if(errorJson && errorJson.message) {
                         errorMessage = `Error de API: ${errorJson.message}`;
                     }
                 } catch(e) { /* No era JSON, usar mensaje gen\u00e9rico */ }
                 setError(errorMessage);
                 setClientes([]);
                 setTotalClientes(0);
                 setIsLoading(false);
                 return;
            }

            // Procesar respuesta exitosa (status 2xx)
            const result = await response.json(); // Esperar y parsear { success: bool, data: [], total: N, ... }

            // Verificar el formato esperado y si la API reporta \u00e9xito
             if (result.success === false) { // Si la API Node.js indica fallo expl\u00edcito
                 console.error('API reported error fetching clients:', result.message, result);
                 setError(result.message || 'API reportó error al listar clientes.');
                 setClientes([]);
                 setTotalClientes(0);
             } else if (!Array.isArray(result.data) || typeof result.total === 'undefined') {
                 // Si success es true o simplemente devuelve { data: [...], total: N } pero con formato inesperado
                 console.error('Formato inesperado de respuesta de la API al listar clientes:', result);
                 setError('Formato de respuesta de clientes incorrecto.');
                 setClientes([]);
                 setTotalClientes(0);
             } else {
                 // Datos recibidos correctamente
                 setClientes(result.data);
                 setTotalClientes(result.total);
             }


        } catch (fetchError) {
            console.error('Error en la llamada fetch al cargar clientes:', fetchError);
            // Error de red, servidor no responde, etc.
            setError(`Error de conexi\u00f3n al cargar clientes: ${fetchError.message}`);
            setClientes([]);
            setTotalClientes(0);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, token, isLoggedIn, logout]);

    // --- Efecto para Cargar Clientes al Montar y Cambiar Paginación/Búsqueda ---
    useEffect(() => {
        // Solo llamar a fetchClientes si est\u00e1 logueado (la funci\u00f3n misma verifica esto tambi\u00e9n)
        if (isLoggedIn) {
            fetchClientes();
        }
    }, [fetchClientes, isLoggedIn]); // Dependencia: fetchClientes (gracias a useCallback), y isLoggedIn


    // --- Manejadores del Modal y Formulario ---

    // Abrir modal en modo 'agregar'
    const handleAddClientClick = () => {
        openModal('agregar');
    }

    // Abrir modal (lógica interna)
    const openModal = (mode, clientData = null) => {
        setModalMode(mode);
        setEditingClient(clientData);

        setFormError(null); // Limpiar errores previos del formulario

        if (mode === 'editar' && clientData) {
            // Llenar el formulario con los datos del cliente a editar
            setFormData({
                id_cliente: clientData.id_cliente || '',
                nombre: clientData.nombre || '',
                dni: clientData.dni || '',
                telefono: clientData.telefono || '',
                direccion: clientData.direccion || '',
            });
        } else {
            // Resetear el formulario para agregar
            setFormData({
                id_cliente: '',
                nombre: '',
                dni: '',
                telefono: '',
                direccion: '',
            });
        }
        setIsModalOpen(true); // Abrir el modal
    };

    // Cerrar modal
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingClient(null); // Limpiar datos del cliente editado
        setFormError(null); // Limpiar errores del formulario
        setFormData({ // Resetear el estado del formulario
            id_cliente: '', nombre: '', dni: '', telefono: '', direccion: '',
        });
    };

    // Manejar cambios en los inputs del formulario
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };


    // --- Manejador del Envío del Formulario (Guardar Cliente) ---
    const handleFormSubmit = async (event) => {
        event.preventDefault();

        if (!isLoggedIn || !token) {
            console.warn("Attempted to save client without being logged in.");
            if(logout) logout();
            return;
        }

        setIsSaving(true);
        setFormError(null);

        const action = modalMode === 'agregar' ? 'agregar' : 'actualizar';
        const dataToSend = {
            ...formData,
            action: action // Incluir la acci\u00f3n en el cuerpo JSON
        };

        try {
            const response = await fetch(CLIENTES_API_ENDPOINT, {
                method: 'POST', // POST para agregar y actualizar (siguiendo tu l\u00f3gica de 'action')
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // <--- Envía el token JWT aquí
                },
                body: JSON.stringify(dataToSend),
            });

            // Manejo de errores HTTP (401, 403, 400, 409, 500, etc.)
            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error(`Error HTTP ${response.status} during client ${action}:`, errorBody);

                 let errorMessage = `Error al ${action} cliente: ${response.status}`;
                 try {
                     const errorJson = JSON.parse(errorBody);
                     if(errorJson && errorJson.message) {
                         errorMessage = errorJson.message; // Usar mensaje de error del backend si est\u00e1 disponible
                     }
                 } catch(e) { /* No era JSON, usar mensaje gen\u00e9rico */ }

                 setFormError(errorMessage);

                // Si es no autorizado (401/403), cerrar sesi\u00f3n
                 if (response.status === 401 || response.status === 403) {
                     if(logout) logout();
                 }

                 return; // Detener procesamiento posterior
            }

            // Procesar respuesta exitosa (status 2xx)
            const result = await response.json(); // Esperar respuesta { success: bool, message: string, ... }

            if (result.success) {
                // Acci\u00f3n exitosa (agregar o actualizar)
                // showNotification(result.message || `Cliente ${action === 'agregar' ? 'agregado' : 'actualizado'} exitosamente.`, 'success');
                closeModal(); // Cerrar modal

                // Recargar la lista de clientes para ver los cambios
                if(action === 'agregar') {
                    setCurrentPage(1); // Ir a la primera p\u00e1gina al agregar
                } else {
                    fetchClientes(); // Recargar la p\u00e1gina actual al actualizar
                }

            } else {
                 // La API respondi\u00f3 2xx pero con success: false (ej. validaci\u00f3n del backend sin HTTP error)
                 console.warn(`API reported success: false during client ${action}:`, result.message);
                 setFormError(result.message || `Error al ${action} el cliente.`);
                 // showNotification(result.message || `Error al ${action} el cliente.`, 'error');
            }

        } catch (fetchError) {
            console.error(`Error en la llamada fetch durante client ${action}:`, fetchError);
             setFormError(`Error de conexi\u00f3n: ${fetchError.message}. Intente m\u00e1s tarde.`);
            // showNotification(`Error de conexi\u00f3n: ${fetchError.message}.`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Manejador para Eliminar Cliente ---
    const handleDeleteClick = async (clientId) => {
        if (!isLoggedIn || !token) {
             console.warn("Attempted to delete client without being logged in.");
             if(logout) logout();
             return;
        }

        try {
            const fetchOptions = {
                method: 'POST', // Usamos POST como en tu l\u00f3gica de 'action'
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // <--- Envía el token JWT aquí
                },
                body: JSON.stringify({ action: 'eliminar', id_cliente: clientId })
            };

            const response = await fetch(CLIENTES_API_ENDPOINT, fetchOptions);

            // Manejo de errores HTTP (401, 403, 404, 409, 500, etc.)
            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error(`Error HTTP ${response.status} during client deletion (ID: ${clientId}):`, errorBody);

                 let errorMessage = `Error al eliminar cliente: ${response.status}`;
                 try {
                     const errorJson = JSON.parse(errorBody);
                     if(errorJson && errorJson.message) {
                         errorMessage = errorJson.message; // Usar mensaje de error del backend si est\u00e1 disponible
                     }
                 } catch(e) { /* No era JSON, usar mensaje gen\u00e9rico */ }

                 setError(errorMessage); // Usar estado de error de la tabla principal

                 // Si es no autorizado (401/403), cerrar sesi\u00f3n
                  if (response.status === 401 || response.status === 403) {
                      if(logout) logout();
                  }

                 return; // Detener procesamiento posterior
            }

            // Procesar respuesta exitosa (status 2xx)
            const result = await response.json(); // Esperar respuesta { success: bool, message: string }

            if (result.success) {
                // showNotification(result.message || 'Cliente eliminado exitosamente.', 'success');
                // Recargar la lista de clientes para reflejar la eliminaci\u00f3n
                const totalPagesAfterDelete = Math.ceil((totalClientes - 1) / itemsPerPage);
                if (currentPage > totalPagesAfterDelete && currentPage > 1) {
                    setCurrentPage(totalPagesAfterDelete); // Ir a la p\u00e1gina anterior si la actual queda vac\u00eda
                } else {
                    fetchClientes(); // Recargar la p\u00e1gina actual
                }

            } else {
                // La API respondi\u00f3 2xx pero con success: false
                console.warn(`API reported success: false during client deletion (ID: ${clientId}):`, result.message);
                setError(result.message || 'Error al eliminar el cliente.'); // Usar estado de error de la tabla principal
                // showNotification(result.message || 'Error al eliminar el cliente.', 'error');
            }

        } catch (fetchError) {
            console.error(`Error en la llamada fetch durante client deletion (ID: ${clientId}):`, fetchError);
            setError(`Error de conexi\u00f3n al eliminar cliente: ${fetchError.message}.`);
            // showNotification(`Error de conexi\u00f3n al eliminar cliente: ${fetchError.message}.`, 'error');
        }
    };

    // --- Manejador para Editar Cliente (desde el bot\u00f3n en la tabla) ---
    // Llama a la API para obtener los datos frescos de un cliente espec\u00edfico
    const handleEditClick = async (clientId) => {
         if (!isLoggedIn || !token) {
               console.warn("Attempted to edit client without being logged in.");
               if(logout) logout();
               return;
         }

         try {
              const response = await fetch(`${CLIENTES_API_ENDPOINT}?action=obtener&id=${clientId}`, {
                  method: 'GET',
                  headers: {
                       'Authorization': `Bearer ${token}`, // <--- Envía el token JWT aquí
                       'Content-Type': 'application/json',
                  },
              });

              // Manejo de errores HTTP
              if (response.status === 401 || response.status === 403) {
                  console.error('API returned 401/403 on getting client for edit. Logging out.');
                   if(logout) logout();
                  setError('Sesión expirada o no autorizado para obtener datos del cliente.');
                   return;
              }

              if (!response.ok) {
                  const errorBody = await response.text();
                  console.error(`Error HTTP ${response.status} getting client for edit (ID: ${clientId}):`, errorBody);
                   let errorMessage = `Error al obtener datos del cliente: ${response.status}`;
                   try {
                       const errorJson = JSON.parse(errorBody);
                       if(errorJson && errorJson.message) {
                            errorMessage = errorJson.message;
                       }
                   } catch(e) { /* No era JSON */ }
                   setError(errorMessage);
                   return;
              }

              // Procesar respuesta exitosa (status 2xx)
               const result = await response.json(); // Espera el objeto cliente O { success: true, data: cliente }

              // Verificar si la respuesta es un objeto cliente v\u00e1lido o { success: true, data: cliente }
               if (result && result.id_cliente) { // Asumimos que un cliente v\u00e1lido siempre tendr\u00e1 id_cliente
                   openModal('editar', result); // Abrir modal con los datos obtenidos
               } else if (result && result.success && result.data && result.data.id_cliente) { // Si el backend devuelve { success: true, data: cliente }
                   openModal('editar', result.data);
               } else {
                 console.warn(`API did not return valid client data for ID ${clientId}:`, result);
                 setError('No se encontraron datos del cliente para editar.');
               }


          } catch (fetchError) {
               console.error(`Error en la llamada fetch al obtener cliente para editar (ID: ${clientId}):`, fetchError);
               setError(`Error de conexi\u00f3n al obtener datos del cliente: ${fetchError.message}.`);
          }
    };

    // --- Manejador para la Búsqueda ---
    const handleSearchChange = (event) => {
        const newSearchTerm = event.target.value;
        setSearchTerm(newSearchTerm);
        setCurrentPage(1); // Resetear a la primera p\u00e1gina al buscar
    };


    // --- Funciones de Paginación (Renderizado) ---
    const renderPagination = () => {
        const totalPages = Math.ceil(totalClientes / itemsPerPage);

        if (totalPages <= 1) {
            return null;
        }

        const buttons = [];
        // Bot\u00f3n Anterior
        buttons.push(
            <button key="prev" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                « Anterior
            </button>
        );

        // N\u00fameros de P\u00e1gina
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
             buttons.push(<span key="start-dots" className="pagination-dots-2">...</span>);
        }

        for (let i = startPage; i <= endPage; i++) {
            buttons.push(
                <button
                    key={i}
                    className={i === currentPage ? 'active-2' : ''}
                    onClick={() => setCurrentPage(i)}
                >
                    {i}
                </button>
            );
        }

        if (endPage < totalPages) {
             buttons.push(<span key="end-dots" className="pagination-dots-2">...</span>);
        }


        // Bot\u00f3n Siguiente
        buttons.push(
            <button key="next" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                Siguiente »
            </button>
        );

        return <div className="pagination-controls-2">{buttons}</div>;
    };

    // --- Renderizado del Componente ---
    return (
        <main className="container3-2">
            <h2 className="Listado-2">Gestión de Clientes</h2>

            <div className="controls-container-2">
                <div id="search-container-2">
                    <input
                        type="text"
                        id="search-input-2"
                        placeholder="Buscar cliente por nombre o DNI..." // Placeholder m\u00e1s descriptivo
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>

                <div className="buttons-row-2">
                    {/* Bot\u00f3n para abrir modal Agregar */}
                    <button
                        id="btn-nuevo-cliente-2"
                        className="btn-agregar-2"
                        onClick={handleAddClientClick}
                    >
                        Agregar Nuevo Cliente
                    </button>
                </div>

                {/* Contenedor de mensajes - Si no usas notificaciones globales, puedes activarlo */}
                 {/* <div id="message-container-2" className="message-container-2" style={{display: error ? 'block' : 'none'}}>
                    <span id="message-text-2" style={{color: 'red'}}>{error}</span>
                 </div> */}
                 {/* Si usas 'error' para mostrarlo arriba de la tabla, este div est\u00e1 duplicado */}

            </div>

            {/* Tabla de Clientes */}
            <table id="clientes-table-2">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>DNI</th>
                        <th>Teléfono</th>
                        <th>Dirección</th>
                        <th>Fecha de Registro</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                {/* Cuerpo de la tabla: Renderizado condicional y din\u00e1mico */}
                <tbody id="clientes-tbody-2">
                    {isLoading && (
                        <tr className="empty-table-message-2">
                            <td colSpan="7" style={{ textAlign: 'center' }}>Cargando clientes...</td>
                        </tr>
                    )}
                    {/* Ya tienes el error mostrado encima de la tabla si activas el div, o puedes mostrarlo aqu\u00ed tambi\u00e9n */}
                    {/* {error && (
                         <tr className="empty-table-message-2">
                             <td colSpan="7" style={{ textAlign: 'center', color: 'red' }}>Error: {error}</td>
                         </tr>
                     )} */}
                    {!isLoading && !error && clientes.length === 0 && (
                        <tr className="empty-table-message-2">
                            <td colSpan="7" style={{ textAlign: 'center' }}>No hay clientes registrados.</td>
                        </tr>
                    )}
                    {!isLoading && !error && clientes.length > 0 && (
                        clientes.map(cliente => (
                            <tr key={cliente.id_cliente}>
                                <td>{cliente.id_cliente}</td>
                                <td>{cliente.nombre}</td>
                                <td>{cliente.dni}</td>
                                <td>{cliente.telefono || '-'}</td>
                                <td>{cliente.direccion || '-'}</td>
                                {/* La fecha ya deber\u00eda venir formateada del backend */}
                                <td>{cliente.fecha_registro || '-'}</td>
                                <td>
                                    <button
                                        className="btn-accion-2 btn-editar-2"
                                        onClick={() => handleEditClick(cliente.id_cliente)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        className="btn-accion-2 btn-eliminar-2"
                                        onClick={() => handleDeleteClick(cliente.id_cliente)}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Controles de Paginación */}
            {renderPagination()}


            {/* Modal para Agregar/Editar Cliente - Renderizado condicional */}
            {isModalOpen && (
                <div id="cliente-modal-2" className="modal-2" style={{ display: 'block' }}>
                    <div className="modal-content-2">
                        {/* Botón de cerrar modal */}
                        <span className="close-button-2" onClick={closeModal}>&times;</span>
                        {/* T\u00edtulo del modal basado en el modo */}
                        <h3 id="modal-title-2">{modalMode === 'agregar' ? 'Agregar Cliente' : 'Editar Cliente'}</h3>
                        {/* Formulario del modal con manejadores y valores controlados */}
                        <form id="cliente-form-2" onSubmit={handleFormSubmit}>
                            {/* Input oculto para el ID en modo edici\u00f3n */}
                            {modalMode === 'editar' && (
                                <input type="hidden" id="id_cliente-2" name="id_cliente" value={formData.id_cliente} />
                            )}

                            {/* Labels e Inputs controlados */}
                            <label htmlFor="nombre-2">Nombre:</label>
                            <input type="text" id="nombre-2" name="nombre" required value={formData.nombre} onChange={handleFormChange} />

                            <label htmlFor="dni-2">DNI:</label>
                            <input type="text" id="dni-2" name="dni" required value={formData.dni} onChange={handleFormChange} />

                            <label htmlFor="telefono-2">Teléfono:</label>
                            <input type="text" id="telefono-2" name="telefono" value={formData.telefono} onChange={handleFormChange} />

                            <label htmlFor="direccion-2">Dirección:</label>
                            <textarea id="direccion-2" name="direccion" value={formData.direccion} onChange={handleFormChange}></textarea>

                            {/* Mostrar error del formulario si existe */}
                            {formError && (
                                <div className="error-message" style={{ color: 'red', marginBottom: '15px' }}>
                                    {formError}
                                </div>
                            )}

                            <div className="form-buttons-2">
                                {/* Bot\u00f3n Guardar - Deshabilitado al enviar */}
                                <button type="submit" className="btn-accion-2 btn-guardar-2" disabled={isSaving}>
                                    {isSaving ? 'Guardando...' : 'Guardar'}
                                </button>
                                {/* Bot\u00f3n Cancelar */}
                                <button type="button" className="btn-accion-2 btn-cancelar-2" onClick={closeModal}>
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

export default ClientesPage;