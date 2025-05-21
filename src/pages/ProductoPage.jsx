// src/pages/ProductoPage.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext'; // <-- Importar AuthContext

// Puedes necesitar useContext(AuthContext) si las llamadas a la API requieren token de autenticación
// import { useAuth } from '../context/AuthContext'; // Comentado, usaremos useContext directamente
// Si tienes un sistema de notificaciones global (recomendado)
// import { useNotification } from '../context/NotificationContext'; // Descomentar si tienes este hook

// URL base para las llamadas a la API de productos/inventario en tu backend Node.js
const API_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/productos` : '/api/productos'; // Usar variable de entorno si existe
// Asegúrate que esta URL sea correcta según tu server Node.js

function ProductoPage() { 
    // --- Usar AuthContext para obtener el token y estado de login ---
    const { token, isLoggedIn, logout } = useContext(AuthContext);

    // --- Estado para los Datos de Productos y su Carga/Error ---
    const [productos, setProductos] = useState([]);
    // Lista de productos mostrada actualmente
    const [isLoadingProductos, setIsLoadingProductos] = useState(true);
    // Estado de carga específico para productos
    const [errorProductos, setErrorProductos] = useState(null);
    // Estado de error específico para productos

    // --- Estado para Paginación de Productos ---
    const [currentPageProductos, setCurrentPageProductos] = useState(1);
    // Página actual solicitada
    const [itemsPerPageProductos] = useState(10);
    // Productos por página (constante)
    const [totalProductos, setTotalProductos] = useState(0);
    // Total de productos (para paginación)
    const [refreshProductosTrigger, setRefreshProductosTrigger] = useState(0);
    // Trigger para forzar recarga de productos

    // --- Estado para Búsqueda de Productos ---
    const [searchTermProductos, setSearchTermProductos] = useState('');

    // --- Estado para Datos de Categorías (para la tabla de gestión en el modal) ---
    const [categoriasTabla, setCategoriasTabla] = useState([]);
    // Lista de categorías para la tabla en el modal
    const [isLoadingCategoriasTabla, setIsLoadingCategoriasTabla] = useState(true);
    // Carga para la tabla de categorías
    const [errorCategoriasTabla, setErrorCategoriasTabla] = useState(null);
    // Error para la tabla de categorías

    // --- Estado para Paginación de Categorías (Tabla) ---
    const [currentPageCategoriasTabla, setCurrentPageCategoriasTabla] = useState(1);
    const [itemsPerPageCategoriasTabla] = useState(5); // Constante para categorías
    const [totalCategoriasTabla, setTotalCategoriasTabla] = useState(0);
    const [refreshCategoriasTrigger, setRefreshCategoriasTrigger] = useState(0); // Trigger para forzar recarga de categorías

    // --- Estado para Búsqueda de Categorías (Tabla) ---
    const [searchTermCategoriasTabla, setSearchTermCategoriasTabla] = useState('');

    // --- Estado para Datos de Categorías (para el <select> del formulario de Producto) ---
    const [categoriasSelect, setCategoriasSelect] = useState([]);
    // Lista de categorías para el select
    const [isLoadingCategoriasSelect, setIsLoadingCategoriasSelect] = useState(true);
    // Carga para el select
    const [errorCategoriasSelect, setErrorCategoriasSelect] = useState(null);
    // Error para el select


    // --- Estado para Modales ---
    const [isProductoModalOpen, setIsProductoModalOpen] = useState(false);
    // Visibilidad modal Producto
    const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
    // Visibilidad modal Categoría

    // --- Estado para el Modal de Producto (Agregar/Editar) ---
    const [productoModalMode, setProductoModalMode] = useState('agregar');
    // 'agregar' o 'editar'
    const [editingProductId, setEditingProductId] = useState(null);
    // ID del producto editando (null si agregando)

    // --- Estado para el Formulario de Producto ---
    const [productoFormData, setProductoFormData] = useState({
        id_producto: '', // Campo oculto para el ID en modo edición
        nombre: '',
        descripcion: '',
        stock: 0,
        precio: 0,
        id_categoria: '', // Debe coincidir con el value de <option>
    });
    const [productoFormError, setProductoFormError] = useState(null); // Errores específicos del formulario de producto
    const [isSavingProducto, setIsSavingProducto] = useState(false);
    // Estado para deshabilitar botón Guardar Producto

    // --- Estado para el Formulario de Categoría (Agregar) ---
    const [categoriaFormData, setCategoriaFormData] = useState({
        nombre: '',
    });
    const [categoriaFormError, setCategoriaFormError] = useState(null); // Errores específicos del formulario de categoría
    const [isSavingCategoria, setIsSavingCategoria] = useState(false);
    // Estado para deshabilitar botón Agregar Categoría

    // Hook para notificaciones (ejemplo, depende de tu implementación global)
    // const showNotification = useNotification(); // Descomentar si tienes este hook


    // --- Función Genérica de Renderizado de Paginación (Reemplaza renderPagination de tu JS) ---
    // Esta función toma los datos necesarios y devuelve el JSX para la paginación
    const renderPagination = (totalItems, itemsPerPage, currentPage, setCurrentPageFunc) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) {
            return null;
        }

        const buttons = [];
        buttons.push(
            <button type="button" key="prev" disabled={currentPage === 1} onClick={() => setCurrentPageFunc(currentPage - 1)} className="btn-accion pagination-btn"> {/* Restaurar className */}
                « Anterior
            </button>
        );
        // Lógica simple para mostrar números de página
         let startPage = Math.max(1, currentPage - 2);
         let endPage = Math.min(totalPages, currentPage + 2);

          if (endPage - startPage < 4) {
              if (startPage === 1) {
                  endPage = Math.min(totalPages, startPage + 4);
              } else if (endPage === totalPages) {
                  startPage = Math.max(1, endPage - 4);
              }
          }

          if (startPage > 1) {
              buttons.push(<button type="button" key={1} className="btn-accion pagination-btn" onClick={() => setCurrentPageFunc(1)}>1</button>); {/* Restaurar className */}
              if (startPage > 2) {
                  buttons.push(<span key="ellipsis-start" className="pagination-info">...</span>); {/* Restaurar className */}
              }
          }


        for (let i = startPage; i <= endPage; i++) {
            buttons.push(
                <button
                    type="button"
                    key={i}
                    className={`btn-accion pagination-btn${i === currentPage ? ' active current-page' : ''}`} // Restaurar className
                    onClick={() => setCurrentPageFunc(i)}
                >
                    {i}
                </button>
            );
        }

         if (endPage < totalPages) {
              if (endPage < totalPages - 1) {
                  buttons.push(<span key="ellipsis-end" className="pagination-info">...</span>); {/* Restaurar className */}
              }
              buttons.push(<button type="button" key={totalPages} className="btn-accion pagination-btn" onClick={() => setCurrentPageFunc(totalPages)}>{totalPages}</button>); {/* Restaurar className */}
         }


        buttons.push(
            <button type="button" key="next" disabled={currentPage === totalPages} onClick={() => setCurrentPageFunc(currentPage + 1)} className="btn-accion pagination-btn"> {/* Restaurar className */}
                Siguiente »
            </button>
        );
        return <div className="pagination-controls">{buttons}</div>; {/* Restaurar className */}
    };


    // --- Funciones de Carga de Datos (Reemplazan cargarProductos y cargarCategorias de tu JS) ---

    // Carga productos PAGINADOS (y filtrados)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const fetchProductos = useCallback(async () => {
        if (!isLoggedIn || !token) {
             setIsLoadingProductos(false);
             setProductos([]);
             setTotalProductos(0);
             setErrorProductos('Debes iniciar sesión para ver los productos.');
             return;
        }

        setIsLoadingProductos(true);
        setErrorProductos(null);

        try {
            // Construir URL con paginación y búsqueda
            const queryParams = new URLSearchParams({
                action: 'listar',
                page: currentPageProductos,
                limit: itemsPerPageProductos,
            });

            if (searchTermProductos) {
                 queryParams.append('search', searchTermProductos);
            }

             const url = `${API_URL}?${queryParams.toString()}`;
             console.log('Fetching productos:', url);


            const response = await fetch(url, {
                 method: 'GET',
                 headers: {
                     'Authorization': `Bearer ${token}`, // <-- Incluir el token en el encabezado
                     'Content-Type': 'application/json', // Aunque es GET, es buena práctica
                 },
            });

            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error('Error fetching products HTTP:', response.status, errorBody);

                 if (response.status === 401 || response.status === 403) {
                     console.error('API returned 401/403 on fetching products. Logging out.');
                     if(logout) logout(); // Llamar a logout si no autorizado
                     setErrorProductos('Sesión expirada o no autorizado para ver productos.');
                     setIsLoadingProductos(false);
                     return; // Salir para no procesar como JSON
                 }

                 // Intentar parsear el error como JSON si es posible, si no, usar el texto
                 let errorMessage = `Error al cargar productos: ${response.status}`;
                  try {
                      const errorJson = JSON.parse(errorBody);
                      if (errorJson && errorJson.message) {
                           errorMessage = `Error de API: ${errorJson.message}`;
                      }
                  } catch (e) {
                      // Si no es JSON, usar el estado HTTP y quiz\u00e1s parte del cuerpo si es legible
                      errorMessage = `Error al cargar productos: ${response.status} - ${errorBody.substring(0, 100)}...`;
                  }
                 throw new Error(errorMessage); // Lanzar error para ser capturado abajo
            }

            // --- Procesar respuesta JSON ---
            const result = await response.json(); // Esto fallará si la respuesta no es JSON (ej: HTML)

             if (!result || typeof result.total === 'undefined' || !Array.isArray(result.data) || result.success === false) {
                 const apiErrorMessage = result?.message || 'Formato de respuesta de productos incorrecto o API reportó error.';
                 console.error('API error fetching products:', apiErrorMessage, result);
                 // showNotification(apiErrorMessage, 'error'); // Notificaci\u00f3n global
                 throw new Error(apiErrorMessage);
             }


            setProductos(result.data);
            setTotalProductos(result.total);
            // Lógica para volver a la página anterior si la actual queda vacía después de eliminar/filtrar
             // Se recalcula el total de páginas basado en el NUEVO total y el límite
            const totalPagesAfterFetch = Math.ceil(result.total / itemsPerPageProductos);
            // Si la página actual es mayor que el total de páginas calculadas, y el total de productos es mayor que 0 (para evitar bucle infinito con 0 productos)
            if (currentPageProductos > totalPagesAfterFetch && result.total > 0) {
                 // Ir a la última página válida
                 setCurrentPageProductos(totalPagesAfterFetch > 0 ? totalPagesAfterFetch : 1);
            } else if (currentPageProductos > 1 && result.total === 0) {
                 // Si estamos en una página > 1 pero el total de productos es 0, ir a p\u00e1gina 1
                 setCurrentPageProductos(1);
            }


        } catch (fetchError) {
            console.error('Error al cargar productos (catch):', fetchError);
            setErrorProductos(`Error al cargar productos: ${fetchError.message}`);
            setProductos([]);
            setTotalProductos(0);
            // showNotification(`Error al cargar productos: ${fetchError.message}`, 'error'); // Notificaci\u00f3n global
        } finally {
            setIsLoadingProductos(false);
        }
    }, [currentPageProductos, itemsPerPageProductos, searchTermProductos, refreshProductosTrigger, isLoggedIn, token, logout]); // Dependencias: Paginación, búsqueda, trigger de recarga, y AUTENTICACI\u00d3N


    // Carga categorías PAGINADAS para la tabla del modal de gestión
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const fetchCategoriasTabla = useCallback(async () => {
        if (!isLoggedIn || !token) {
             setIsLoadingCategoriasTabla(false);
             setCategoriasTabla([]);
             setTotalCategoriasTabla(0);
             setErrorCategoriasTabla('Debes iniciar sesión para ver las categorías.');
             return;
        }

        setIsLoadingCategoriasTabla(true);
        setErrorCategoriasTabla(null);

        try {
            // Construir URL con paginación y búsqueda (si aplica para categorías)
             const queryParams = new URLSearchParams({
                 action: 'listar_categorias',
                 page: currentPageCategoriasTabla,
                 limit: itemsPerPageCategoriasTabla,
             });

             if (searchTermCategoriasTabla) {
                 queryParams.append('search', searchTermCategoriasTabla);
             }

             const url = `${API_URL}?${queryParams.toString()}`;
             console.log('Fetching categorias tabla:', url);


            const response = await fetch(url, {
                 method: 'GET',
                 headers: {
                     'Authorization': `Bearer ${token}`, // <-- Incluir el token
                     'Content-Type': 'application/json', // Buena práctica
                 },
            });

            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error('Error fetching categories table HTTP:', response.status, errorBody);

                  if (response.status === 401 || response.status === 403) {
                      console.error('API returned 401/403 on fetching categories table. Logging out.');
                      if(logout) logout();
                       setErrorCategoriasTabla('Sesión expirada o no autorizado para ver categorías.');
                       setIsLoadingCategoriasTabla(false);
                       return;
                  }

                  let errorMessage = `Error al cargar categorías: ${response.status}`;
                  try {
                      const errorJson = JSON.parse(errorBody);
                      if (errorJson && errorJson.message) {
                           errorMessage = `Error de API: ${errorJson.message}`;
                      }
                  } catch (e) {
                      errorMessage = `Error al cargar categorías: ${response.status} - ${errorBody.substring(0, 100)}...`;
                  }
                 throw new Error(errorMessage);
            }

            // --- Procesar respuesta JSON ---
            const result = await response.json(); // Esto fallará si la respuesta no es JSON

             if (!result || typeof result.total === 'undefined' || !Array.isArray(result.data) || result.success === false) {
                 const apiErrorMessage = result?.message || 'Formato de respuesta de categorías (tabla) incorrecto o API reportó error.';
                 console.error('API error fetching categories table:', apiErrorMessage, result);
                 // showNotification(apiErrorMessage, 'error'); // Notificaci\u00f3n global
                 throw new Error(apiErrorMessage);
             }


            setCategoriasTabla(result.data);
            setTotalCategoriasTabla(result.total);
            // Lógica para volver a la página anterior si la actual queda vacía
            const totalPagesAfterFetch = Math.ceil(result.total / itemsPerPageCategoriasTabla);
            if (currentPageCategoriasTabla > totalPagesAfterFetch && result.total > 0) {
                 setCurrentPageCategoriasTabla(totalPagesAfterFetch > 0 ? totalPagesAfterFetch : 1);
            } else if (currentPageCategoriasTabla > 1 && result.total === 0) {
                 setCurrentPageCategoriasTabla(1);
            }


        } catch (fetchError) {
            console.error('Error al cargar categorías (tabla catch):', fetchError);
            setErrorCategoriasTabla(`Error al cargar categorías: ${fetchError.message}`);
            setCategoriasTabla([]);
            setTotalCategoriasTabla(0);
            // showNotification(`Error al cargar categorías (tabla): ${fetchError.message}`, 'error'); // Notificaci\u00f3n global
        } finally {
            setIsLoadingCategoriasTabla(false);
        }
    }, [currentPageCategoriasTabla, itemsPerPageCategoriasTabla, searchTermCategoriasTabla, refreshCategoriasTrigger, isLoggedIn, token, logout]); // Dependencias: Paginación cat, búsqueda cat, trigger de recarga cat, y AUTENTICACI\u00d3N


    // Carga TODAS las categorías SOLO para el select del formulario de producto
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const fetchCategoriasParaSelect = useCallback(async () => {
         if (!isLoggedIn || !token) {
              setIsLoadingCategoriasSelect(false);
              setCategoriasSelect([]);
              setErrorCategoriasSelect("Debes iniciar sesi\u00f3n para cargar categor\u00edas.");
              return;
         }

        setIsLoadingCategoriasSelect(true);
        setErrorCategoriasSelect(null);
        setCategoriasSelect([]);

        try {
            // Llamada al endpoint que trae TODAS las categorías
             const url = `${API_URL}?action=listar_categorias_todas`;
             console.log('Fetching categorias para select:', url);

            const response = await fetch(url, {
                 method: 'GET',
                 headers: {
                     'Authorization': `Bearer ${token}`, // <-- Incluir el token
                     'Content-Type': 'application/json', // Buena práctica
                 },
            });

            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error('Error fetching categories select HTTP:', response.status, errorBody);

                 if (response.status === 401 || response.status === 403) {
                     console.error('API returned 401/403 on fetching categories select. Logging out.');
                     if(logout) logout();
                     setErrorCategoriasSelect('Sesión expirada o no autorizado para cargar categorías.');
                     setIsLoadingCategoriasSelect(false);
                     return;
                 }

                  let errorMessage = `Error al cargar categorías para el select: ${response.status}`;
                   try {
                       const errorJson = JSON.parse(errorBody);
                       if (errorJson && errorJson.message) {
                            errorMessage = `Error de API: ${errorJson.message}`;
                       }
                   } catch (e) {
                        errorMessage = `Error al cargar categorías para el select: ${response.status} - ${errorBody.substring(0, 100)}...`;
                   }
                  throw new Error(errorMessage);
            }

            // --- Procesar respuesta JSON ---
            const data = await response.json(); // Espera un array de objetos categoría [{id_categoria, nombre}, ...]

             // Verificar si la respuesta es un array (tu PHP devuelve array[] o array vac\u00eda en error/sin datos)
             // La versi\u00f3n corregida del backend Node.js devuelve un array directo
             if (!Array.isArray(data)) {
                 const apiErrorMessage = data?.message || 'Formato de respuesta de categorías (select) incorrecto o API reportó error.';
                 console.error('API error fetching categories select:', apiErrorMessage, data);
                 // showNotification(apiErrorMessage, 'error'); // Notificaci\u00f3n global
                  setCategoriasSelect([]); // Asegurarse de limpiar si el formato es incorrecto
                 throw new Error(apiErrorMessage);
             }


            setCategoriasSelect(data); // Actualizar el estado del select


        } catch (fetchError) {
            console.error('Error al cargar categorías para el select (catch):', fetchError);
            setErrorCategoriasSelect(`Error al cargar categorías para el select: ${fetchError.message}`);
            setCategoriasSelect([]); // Limpiar select en caso de error
            // showNotification(`Error cargando categorías (select): ${fetchError.message}`, 'error'); // Notificaci\u00f3n global
        } finally {
            setIsLoadingCategoriasSelect(false);
        }
    }, [refreshCategoriasTrigger, isLoggedIn, token, logout]); // Dependencia: trigger de recarga de categorías, y AUTENTICACI\u00d3N


     // --- Fetch para obtener los datos de un producto espec\u00edfico para el modal de edici\u00f3n ---
     const fetchProductoParaEditar = useCallback(async (productId) => {
         if (!isLoggedIn || !token) {
              setProductoFormError("Debes iniciar sesi\u00f3n para editar productos.");
              return;
         }

         if (!productId) {
              setProductoFormError('ID de producto no proporcionado para editar.');
              return;
         }

         setProductoFormError(null); // Limpiar errores previos del formulario

         try {
              const url = `${API_URL}?action=obtener&id=${productId}`;
              console.log('Fetching product for edit:', url);

              const response = await fetch(url, {
                   method: 'GET',
                   headers: {
                       'Authorization': `Bearer ${token}`, // <-- Incluir el token
                       'Content-Type': 'application/json', // Buena práctica
                   },
              });

              if (!response.ok) {
                   const errorBody = await response.text();
                   console.error(`Error fetching product (ID: ${productId}) for edit HTTP:`, response.status, errorBody);

                   if (response.status === 401 || response.status === 403) {
                       console.error('API returned 401/403 on getting product for edit. Logging out.');
                       if(logout) logout();
                        setProductoFormError('Sesión expirada o no autorizado para obtener datos del producto.');
                        closeProductoModal(); // Cerrar modal si falla la autenticaci\u00f3n
                        return;
                   }

                   let errorMessage = `Error HTTP al obtener datos del producto: ${response.status}`;
                    try {
                        const errorJson = JSON.parse(errorBody);
                        if(errorJson && errorJson.message) {
                            errorMessage = errorJson.message;
                        }
                    } catch(e) { }

                    setProductoFormError(errorMessage);
                    closeProductoModal(); // Cerrar modal al fallar la carga
                    return;
               }

              // --- Procesar respuesta JSON ---
              const producto = await response.json(); // Espera el objeto producto directo

              // La versi\u00f3n del backend Node.js que te di devuelve el objeto producto directo, no envuelto en success: data:
              // Asegurarnos que el objeto recibido tiene la estructura esperada
              if (!producto || typeof producto.id_producto === 'undefined' || typeof producto.nombre === 'undefined') {
                   const apiErrorMessage = producto?.message || producto?.error || `Producto con ID ${productId} no encontrado o formato incorrecto de datos.`;
                   console.error(`API error fetching product (ID: ${productId}) for edit:`, apiErrorMessage, producto);
                   setProductoFormError(apiErrorMessage);
                   closeProductoModal(); // Cerrar modal si el formato es incorrecto
                   return;
               }


               // Llenar el estado del formulario con los datos obtenidos
               setProductoFormData({
                    id_producto: producto.id_producto || '',
                    nombre: producto.nombre || '',
                    descripcion: producto.descripcion || '', // Manejar descripci\u00f3n opcional/null
                    stock: parseInt(producto.stock) || 0, // Asegurar que stock sea n\u00famero
                    precio: parseFloat(producto.precio).toFixed(2), // Asegurar que precio sea n\u00famero y formatear
                    id_categoria: producto.id_categoria || '', // Usar string vac\u00edo si es null
               });


         } catch (fetchError) {
             console.error(`Error al obtener producto (ID: ${productId}) para editar (catch):`, fetchError);
             setProductoFormError(`Error de conexi\u00f3n al cargar datos del producto: ${fetchError.message}`);
             closeProductoModal(); // Cerrar modal en caso de error de conexi\u00f3n
         }
     }, [token, isLoggedIn, logout]); // Dependencias: token, estado de login, logout


    // --- Efectos para Ejecutar las Cargas de Datos ---

    // Efecto principal para cargar productos al montar, cambiar p\u00e1gina/b\u00fasqueda o trigger, Y cuando cambie el estado de login/token
    useEffect(() => {
        if (isLoggedIn) { // Solo intentar cargar si est\u00e1 logueado
            fetchProductos();
        } else {
            // Limpiar datos si no est\u00e1 logueado
            setProductos([]);
            setTotalProductos(0);
            setIsLoadingProductos(false);
            setErrorProductos('Debes iniciar sesión para ver los productos.');
        }
    }, [fetchProductos, isLoggedIn]); // Dependencia: fetchProductos (cambia si cambian sus propias dependencias), y estado de login


    // Efecto para cargar categorías para la tabla (cuando el modal de gestión está abierto y cambia paginación/búsqueda o trigger) Y cuando cambie el estado de login/token
    useEffect(() => {
         // Solo cargar si est\u00e1 logueado Y el modal est\u00e1 abierto O hay un trigger
        if (isLoggedIn && (isCategoriaModalOpen || refreshCategoriasTrigger > 0)) {
           fetchCategoriasTabla();
        } else if (!isLoggedIn) {
            // Limpiar datos si no est\u00e1 logueado
            setCategoriasTabla([]);
            setTotalCategoriasTabla(0);
            setIsLoadingCategoriasTabla(false);
            setErrorCategoriasTabla('Debes iniciar sesión para ver las categorías.');
        }
    }, [fetchCategoriasTabla, isCategoriaModalOpen, isLoggedIn, refreshCategoriasTrigger]); // DEPENDENCIA AGREGADA: refreshCategoriasTrigger para ESLint


    // Efecto para cargar TODAS las categorías SOLO para el select del formulario de producto, al montar o si hay un trigger de categoría global, Y cuando cambie el estado de login/token
     useEffect(() => {
         if (isLoggedIn) { // Solo intentar cargar si est\u00e1 logueado
             fetchCategoriasParaSelect();
         } else {
             // Limpiar select si no est\u00e1 logueado
             setCategoriasSelect([]);
             setIsLoadingCategoriasSelect(false);
             setErrorCategoriasSelect("Debes iniciar sesi\u00f3n para cargar categor\u00edas.");
         }
     }, [fetchCategoriasParaSelect, isLoggedIn]); // Dependencia: fetchCategoriasParaSelect (cambia si cambia refreshCategoriasTrigger), y estado de login


     // Efecto para cargar datos del producto cuando se abre el modal en modo editar y cambia editingProductId
     useEffect(() => {
         if (isProductoModalOpen && productoModalMode === 'editar' && editingProductId !== null) {
             fetchProductoParaEditar(editingProductId); // Llama a la funci\u00f3n para obtener datos del producto
         } else if (isProductoModalOpen && productoModalMode === 'agregar') {
             // Si el modal se abre en modo agregar, resetear el formulario
             setProductoFormData({
                 id_producto: '', nombre: '', descripcion: '', stock: 0, precio: 0, id_categoria: '',
             });
             setEditingProductId(null);
             setProductoFormError(null);
         } else {
            // Cuando el modal se cierra, limpiar el estado del formulario y editingId
            setProductoFormData({
                id_producto: '', nombre: '', descripcion: '', stock: 0, precio: 0, id_categoria: '',
            });
            setEditingProductId(null);
            setProductoFormError(null);
         }
     }, [isProductoModalOpen, productoModalMode, editingProductId, fetchProductoParaEditar]); // Dependencias: estado del modal, modo, id editando, y la funci\u00f3n de fetch


    // --- Manejadores de Modales ---

    const openProductoModal = (mode, productoId = null) => {
        setProductoModalMode(mode);
        // Setting editingProductId here will trigger the useEffect above if mode is 'editar'
        setEditingProductId(productoId); // Esto disparar\u00e1 el useEffect para cargar datos en modo editar
        setIsProductoModalOpen(true);

        // Limpiar estados relacionados con el formulario al abrir
        setProductoFormError(null);
        setIsSavingProducto(false);

        // Nota: En modo 'editar', la carga de datos se maneja en el useEffect disparado por editingProductId.
        // En modo 'agregar', el useEffect tambi\u00e9n resetea el formulario.

         // Asegurarse de que el select de categorías est\u00e9 cargado antes de abrir el modal
         // El useEffect de fetchCategoriasParaSelect se encarga de cargarlas al inicio o por trigger.
         // No necesitamos llamarlo aqu\u00ed expl\u00edcitamente a menos que est\u00e9s seguro de que no se ha cargado.
    };

    const closeProductoModal = () => {
        setIsProductoModalOpen(false);
        // Limpieza de estado del formulario y editingId ocurre en el useEffect cuando isProductoModalOpen cambia a false.
    };

    const openCategoriaModal = () => {
         if (!isLoggedIn || !token) {
              setErrorCategoriasTabla('Debes iniciar sesión para gestionar categorías.'); // Mostrar error en la secci\u00f3n de tabla cat
              // showNotification('Debes iniciar sesión para gestionar categorías.', 'error'); // Notificaci\u00f3n global
              return; // No abrir modal si no est\u00e1 autenticado
         }
        setIsCategoriaModalOpen(true);
         setCategoriaFormError(null); // Limpiar errores del formulario de categoría
         setCategoriaFormData({ nombre: '' }); // Resetear formulario de categoría
         setSearchTermCategoriasTabla(''); // Limpiar buscador de categorías al abrir
         setCurrentPageCategoriasTabla(1); // Ir a la primera página de categorías al abrir

         // La carga de la tabla de categorías se activa con el useEffect basado en isCategoriaModalOpen o refreshCategoriasTrigger
    };
    const closeCategoriaModal = () => {
        setIsCategoriaModalOpen(false);
         setCategoriaFormError(null);
         setCategoriaFormData({ nombre: '' });
         setSearchTermCategoriasTabla(''); // Limpiar buscador de categorías al cerrar también
         // No es necesario limpiar el estado de la tabla categoriasTabla aquí, ya que se recarga al abrir el modal
    };

    // --- Manejadores de Cambios en Formularios ---
    const handleProductoFormChange = (e) => {
        const { name, value, type } = e.target;
        // Convertir stock y precio a número si son inputs numéricos
         let newValue = value;
         if (type === 'number') {
              // Usar parseFloat para manejar decimales en precio, parseInt para stock
              newValue = name === 'stock' ? parseInt(value) : parseFloat(value);
               // Manejar el caso de input vac\u00edo para n\u00fameros
               if (value === '') {
                   newValue = name === 'stock' ? 0 : 0.0; // O null, dependiendo de c\u00f3mo quieras manejarlo
               }
         }


        setProductoFormData(prev => ({
            ...prev,
            [name]: newValue,
        }));
         setProductoFormError(null); // Limpiar error al cambiar el formulario

    };

    const handleCategoriaFormChange = (e) => {
        const { name, value } = e.target;
        setCategoriaFormData(prev => ({
            ...prev,
            [name]: value,
        }));
         setCategoriaFormError(null); // Limpiar error al cambiar el formulario
    };


    // --- Manejadores de Acciones (Guardar, Eliminar) ---

    // Guardar Producto (Agregar o Actualizar)
    const handleProductoFormSubmit = async (event) => {
        event.preventDefault();

        if (!isLoggedIn || !token) {
             console.warn("Attempted to save product without being logged in.");
             if(logout) logout(); // Llamar a logout si no autenticado
             setIsSavingProducto(false);
             return;
        }

        setIsSavingProducto(true);
        setProductoFormError(null); // Limpiar errores específicos del formulario

        // Validaciones básicas del lado del cliente antes de enviar
         const { nombre, stock, precio, id_categoria } = productoFormData;
         const errors = [];

         if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') errors.push('Nombre es requerido.');

         const parsedStock = parseInt(stock);
         if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) errors.push('Stock debe ser un número entero >= 0.');

         const parsedPrecio = parseFloat(precio);
         if (isNaN(parsedPrecio) || parsedPrecio < 0) errors.push('Precio debe ser un número válido >= 0.');

         const parsedCategoriaId = parseInt(id_categoria);
         if (isNaN(parsedCategoriaId) || parsedCategoriaId <= 0) errors.push('Categoría es requerida.');


        if (errors.length > 0) {
             setProductoFormError('Datos inválidos: ' + errors.join(' '));
             setIsSavingProducto(false);
             // showNotification('Por favor, complete todos los campos obligatorios.', 'error'); // Notificaci\u00f3n global
             return;
        }

        const action = productoModalMode === 'agregar' ? 'agregar' : 'actualizar';
        try {
             // Envía los datos del formulario. Usamos POST con JSON body.
             const dataToSend = {
                 action: action,
                 ...(action === 'actualizar' && { id_producto: parseInt(productoFormData.id_producto) }), // Incluir ID solo si es actualizar
                 nombre: nombre.trim(), // Enviar nombre recortado
                 descripcion: productoFormData.descripcion.trim() || null, // Enviar descripci\u00f3n recortada o null si vac\u00eda
                 stock: parsedStock, // Enviar stock parseado
                 precio: parsedPrecio, // Enviar precio parseado
                 id_categoria: parsedCategoriaId, // Enviar id_categoria parseado
             };


             console.log(`Datos de producto a enviar para ${action}:`, dataToSend);
             console.log(`Sending POST request to: ${API_URL}`);

             const response = await fetch(API_URL, {
                 method: 'POST', // POST como en tu PHP original y backend Node.js
                 headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`, // <-- Incluir el token
                 },
                 body: JSON.stringify(dataToSend), // Enviar datos como JSON
             });


            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error(`Error HTTP ${response.status} during product ${action}:`, errorBody);

                 if (response.status === 401 || response.status === 403) {
                     console.error('API returned 401/403 on saving product. Logging out.');
                     if(logout) logout(); // Llamar a logout si no autorizado
                      setProductoFormError('Sesión expirada o no autorizado para guardar producto.');
                      setIsSavingProducto(false);
                      return; // Salir
                 }

                  // Intentar parsear el error como JSON si es posible
                  let errorMessage = `Error al ${action === 'agregar' ? 'agregar' : 'actualizar'} producto: ${response.status}`;
                   try {
                       const errorJson = JSON.parse(errorBody);
                       if (errorJson && errorJson.message) {
                           errorMessage = errorJson.message; // Usar mensaje de error del backend
                       } else {
                           // Si el error no tiene el formato esperado, usar el estado HTTP y parte del cuerpo
                           errorMessage = `Error al ${action === 'agregar' ? 'agregar' : 'actualizar'} producto: ${response.status} - ${errorBody.substring(0, 100)}...`;
                       }
                   } catch (e) {
                       // Si no es JSON, usar el estado HTTP y parte del cuerpo
                        errorMessage = `Error al ${action === 'agregar' ? 'agregar' : 'actualizar'} producto: ${response.status} - ${errorBody.substring(0, 100)}...`;
                   }
                  throw new Error(errorMessage); // Lanzar error para ser capturado abajo

            }

            const result = await response.json();
            if (result.success) {
                // showNotification(result.message || `Producto ${action === 'agregar' ? 'agregado' : 'actualizado'} exitosamente.`, 'success'); // Notificaci\u00f3n global
                closeProductoModal(); // Cerrar modal de producto
                // Trigger para recargar la lista de productos
                // Esto hace que el useEffect de fetchProductos se re-ejecute
                setRefreshProductosTrigger(prev => prev + 1);
                // Opcional: si es agregar y quieres ir a la primera página para ver el nuevo item:
                 if (action === 'agregar') {
                     setCurrentPageProductos(1);
                 }
            } else {
                console.warn(`API reported error during product ${action}:`, result.message);
                // Mostrar error específico del formulario
                setProductoFormError(result.message || `Error al ${action} el producto.`);
                // showNotification(result.message || `Error al ${action} el producto.`, 'error'); // Notificaci\u00f3n global
            }

        } catch (fetchError) {
            console.error(`Workspace error during product ${action}:`, fetchError);
            // Mostrar error de conexión o inesperado
            setProductoFormError(`Error de conexión: ${fetchError.message}. Intente más tarde.`);
            // showNotification(`Error de conexión: ${fetchError.message}.`, 'error'); // Notificaci\u00f3n global
        } finally {
            setIsSavingProducto(false);
        }
    };


    // Eliminar Producto
    const handleDeleteProducto = async (productId) => {
         if (!isLoggedIn || !token) {
              console.warn("Attempted to delete product without being logged in.");
              if(logout) logout(); // Llamar a logout si no autenticado
              return; // Salir
         }

         setErrorProductos(null); // Limpiar errores de la tabla principal antes de la operaci\u00f3n

        try {
             // Llamada a la API para eliminar producto
             const fetchOptions = {
                 method: 'POST', // POST como en tu PHP original y backend Node.js
                 headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`, // <-- Incluir el token
                 },
                 body: JSON.stringify({ action: 'eliminar', id_producto: productId })
             };
             console.log(`Deleting product ID: ${productId}`);
             console.log(`Sending POST request to: ${API_URL} with payload:`, { action: 'eliminar', id_producto: productId });

             const response = await fetch(API_URL, fetchOptions);


            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error(`Error HTTP ${response.status} during product deletion (ID: ${productId}):`, errorBody);

                 if (response.status === 401 || response.status === 403) {
                      console.error('API returned 401/403 on deleting product. Logging out.');
                      if(logout) logout();
                       setErrorProductos('Sesión expirada o no autorizado para eliminar producto.');
                       return; // Salir
                  }

                  // Intentar parsear el error como JSON si es posible
                  let errorMessage = `Error al eliminar producto: ${response.status}`;
                   try {
                       const errorJson = JSON.parse(errorBody);
                       if (errorJson && errorJson.message) {
                           errorMessage = errorJson.message; // Usar mensaje de error del backend
                       } else {
                           // Si el error no tiene el formato esperado, usar el estado HTTP y parte del cuerpo
                            errorMessage = `Error al eliminar producto: ${response.status} - ${errorBody.substring(0, 100)}...`;
                       }
                   } catch (e) {
                       // Si no es JSON, usar el estado HTTP y parte del cuerpo
                        errorMessage = `Error al eliminar producto: ${response.status} - ${errorBody.substring(0, 100)}...`;
                   }
                 throw new Error(errorMessage); // Lanzar error para ser capturado abajo
            }

            const result = await response.json();
            if (result.success) {
                // showNotification(result.message || 'Producto eliminado exitosamente.', 'success'); // Notificaci\u00f3n global
                 // Trigger para recargar la lista de productos
                 setRefreshProductosTrigger(prev => prev + 1);
                 // La lógica para volver a la página anterior si la actual queda vacía se maneja en fetchProductos después de la recarga.

            } else {
                console.warn(`API reported error during product deletion (ID: ${productId}):`, result.message);
                // Mostrar mensaje de error en la tabla principal
                setErrorProductos(result.message || 'Error al eliminar el producto.');
                // showNotification(result.message || 'Error al eliminar el producto.', 'error'); // Notificaci\u00f3n global
            }

        } catch (fetchError) {
            console.error(`Workspace error during product deletion (ID: ${productId}) (catch):`, fetchError);
            setErrorProductos(`Error de conexión al eliminar producto: ${fetchError.message}.`);
            // showNotification(`Error de conexión al eliminar producto: ${fetchError.message}.`, 'error'); // Notificaci\u00f3n global
        }
    };


    // Guardar Categoría (Agregar)
    const handleCategoriaFormSubmit = async (event) => {
        event.preventDefault();

        if (!isLoggedIn || !token) {
              console.warn("Attempted to add category without being logged in.");
              if(logout) logout(); // Llamar a logout si no autenticado
              setIsSavingCategoria(false);
              return; // Salir
         }

        setIsSavingCategoria(true);
        setCategoriaFormError(null); // Limpiar errores específicos del formulario de categoría

         // Validar nombre de categoría
         if (!categoriaFormData.nombre.trim()) {
             setCategoriaFormError('El nombre de la categoría no puede estar vacío.');
             setIsSavingCategoria(false);
             // showNotification('El nombre de la categoría no puede estar vacío.', 'error');
             return;
         }


        try {
            // Llama a la API para agregar categoría
             const fetchOptions = {
                 method: 'POST', // POST como en tu PHP original y backend Node.js
                 headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`, // <-- Incluir el token
                 },
                 body: JSON.stringify({ action: 'agregar_categoria', nombre: categoriaFormData.nombre.trim() }) // Enviar nombre recortado
             };
             console.log(`Sending POST request to: ${API_URL} with payload:`, { action: 'agregar_categoria', nombre: categoriaFormData.nombre.trim() });


            const response = await fetch(API_URL, fetchOptions);


            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error(`Error HTTP ${response.status} during category addition:`, errorBody);

                  if (response.status === 401 || response.status === 403) {
                       console.error('API returned 401/403 on adding category. Logging out.');
                       if(logout) logout();
                        setCategoriaFormError('Sesión expirada o no autorizado para agregar categoría.');
                        setIsSavingCategoria(false);
                        return; // Salir
                  }

                  // Intentar parsear el error como JSON si es posible
                   let errorMessage = `Error al agregar categoría: ${response.status}`;
                    try {
                        const errorJson = JSON.parse(errorBody);
                        if (errorJson && errorJson.message) {
                            errorMessage = errorJson.message; // Usar mensaje de error del backend
                        } else {
                            // Si el error no tiene el formato esperado, usar el estado HTTP y parte del cuerpo
                             errorMessage = `Error al agregar categoría: ${response.status} - ${errorBody.substring(0, 100)}...`;
                        }
                    } catch (e) {
                        // Si no es JSON, usar el estado HTTP y parte del cuerpo
                         errorMessage = `Error al agregar categoría: ${response.status} - ${errorBody.substring(0, 100)}...`;
                    }
                  throw new Error(errorMessage); // Lanzar error para ser capturado abajo
            }

            const result = await response.json();
            if (result.success) {
                // showNotification(result.message || 'Categoría agregada exitosamente.', 'success'); // Notificaci\u00f3n global
                setCategoriaFormData({ nombre: '' }); // Resetear formulario de categoría
                 setSearchTermCategoriasTabla(''); // Limpiar buscador de categorías
                 // Trigger para recargar la tabla de categorías Y el select del formulario de producto
                 setRefreshCategoriasTrigger(prev => prev + 1);
                 setCurrentPageCategoriasTabla(1); // Ir a la primera página de categorías para ver la nueva

            } else {
                console.warn('API reported error during category addition:', result.message);
                // Mostrar error específico del formulario
                setCategoriaFormError(result.message || 'Error al agregar la categoría.');
                // showNotification(result.message || 'Error al agregar la categoría.', 'error'); // Notificaci\u00f3n global
            }

        } catch (fetchError) {
            console.error('Fetch error during category addition (catch):', fetchError);
            // Mostrar error de conexión o inesperado
            setCategoriaFormError(`Error de conexión: ${fetchError.message}. Intente más tarde.`);
            // showNotification(`Error de conexión: ${fetchError.message}.`, 'error'); // Notificaci\u00f3n global
        } finally {
            setIsSavingCategoria(false);
        }
    };

     // Eliminar Categoría
    const handleDeleteCategoria = async (categoryId) => {
         if (!isLoggedIn || !token) {
               console.warn("Attempted to delete category without being logged in.");
               if(logout) logout(); // Llamar a logout si no autenticado
               return; // Salir
         }

         setErrorCategoriasTabla(null); // Limpiar errores de la tabla de categor\u00edas antes de la operaci\u00f3n

        try {
             // Llama a la API para eliminar categoría
             const fetchOptions = {
                 method: 'POST', // POST como en tu PHP original y backend Node.js
                 headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`, // <-- Incluir el token
                 },
                 body: JSON.stringify({ action: 'eliminar_categoria', id_categoria: categoryId })
             };
             console.log(`Deleting category ID: ${categoryId}`);
             console.log(`Sending POST request to: ${API_URL} with payload:`, { action: 'eliminar_categoria', id_categoria: categoryId });


            const response = await fetch(API_URL, fetchOptions);

            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error(`Error HTTP ${response.status} during category deletion (ID: ${categoryId}):`, errorBody);

                  if (response.status === 401 || response.status === 403) {
                       console.error('API returned 401/403 on deleting category. Logging out.');
                       if(logout) logout();
                        setErrorCategoriasTabla('Sesión expirada o no autorizado para eliminar categoría.');
                       return; // Salir
                  }

                  // Intentar parsear el error como JSON si es posible
                   let errorMessage = `Error al eliminar categoría: ${response.status}`;
                    try {
                        const errorJson = JSON.parse(errorBody);
                        if (errorJson && errorJson.message) {
                            errorMessage = errorJson.message; // Usar mensaje de error del backend
                        } else {
                             // Si el error no tiene el formato esperado, usar el estado HTTP y parte del cuerpo
                             errorMessage = `Error al eliminar categoría: ${response.status} - ${errorBody.substring(0, 100)}...`;
                        }
                    } catch (e) {
                         // Si no es JSON, usar el estado HTTP y parte del cuerpo
                          errorMessage = `Error al eliminar categoría: ${response.status} - ${errorBody.substring(0, 100)}...`;
                    }
                  throw new Error(errorMessage); // Lanzar error para ser capturado abajo
            }

            const result = await response.json();
            if (result.success) {
                // showNotification(result.message || 'Categoría eliminada exitosamente.', 'success'); // Notificaci\u00f3n global
                 // Trigger para recargar la tabla de categorías Y el select del formulario de producto
                 setRefreshCategoriasTrigger(prev => prev + 1);
                 // Lógica para ajustar paginación si se elimina el último de la página
                 const totalPagesAfterDelete = Math.ceil((totalCategoriasTabla - 1) / itemsPerPageCategoriasTabla);
                 if (currentPageCategoriasTabla > totalPagesAfterDelete && totalCategoriasTabla > 0) { // A\u00f1adir check totalCategoriasTabla > 0
                     setCurrentPageCategoriasTabla(totalPagesAfterDelete > 0 ? totalPagesAfterDelete : 1);
                 }

                 // NOTA: También es probable que necesites recargar la lista de productos, ya que alguno podría haber perdido su categoría (si permites null en DB) o la referencia a la categor\u00eda eliminada.
                 setRefreshProductosTrigger(prev => prev + 1);


            } else {
                console.warn(`API reported error during category deletion (ID: ${categoryId}):`, result.message);
                // Mostrar mensaje de error (podría ser un error global o un mensaje en el modal)
                setErrorCategoriasTabla(result.message || 'Error al eliminar la categoría.');
                // showNotification(result.message || 'Error al eliminar la categoría.', 'error'); // Notificaci\u00f3n global
            }

        } catch (fetchError) {
            console.error(`Workspace error during category deletion (ID: ${categoryId}) (catch):`, fetchError);
            setErrorCategoriasTabla(`Error de conexión al eliminar categoría: ${fetchError.message}.`);
            // showNotification(`Error de conexión al eliminar categoría: ${fetchError.message}.`, 'error'); // Notificaci\u00f3n global
        }
    };


    // --- Manejadores de Búsqueda ---
    const handleSearchProductosChange = (event) => {
        // Al cambiar el input de búsqueda de productos, actualiza el estado y resetea la paginación de productos
        setSearchTermProductos(event.target.value);
        setCurrentPageProductos(1); // Resetear a la primera página al buscar productos
    };
    const handleSearchCategoriasChange = (event) => {
        // Al cambiar el input de búsqueda de categorías, actualiza el estado y resetea la paginación de categorías
        setSearchTermCategoriasTabla(event.target.value);
        setCurrentPageCategoriasTabla(1); // Resetear a la primera página al buscar categorías
    };

    // --- JSX: Traducción del HTML ---
    return (
        <main className="container3"> {/* Restaurar className */}
            <h2 className="Listado">Gestión de Inventario</h2> {/* Restaurar className */}

            <div className="controls-container"> {/* Restaurar className */}
                <div id="search-container"> {/* Restaurar ID */}

               {/* Input de búsqueda de PRODUCTOS controlado por estado */}
                    <input
                        type="text"
                        id="search-input" // Restaurar ID
                        placeholder="Buscar producto por nombre..."
                        value={searchTermProductos} // Controlar el valor con el estado
                        onChange={handleSearchProductosChange} // Manejar cambios
                    />
                </div>

                <div className="buttons-row"> {/* Restaurar className */}
                    {/* Botón para abrir modal Producto */}
                    <button
                        id="btn-nuevo-producto" // Restaurar ID
                        className="btn-agregar" // Restaurar className
                        onClick={() => openProductoModal('agregar')} // Abrir modal en modo agregar
                    >
                        Agregar Nuevo Producto
                    </button>
                    {/* Botón para abrir modal Categoría */}
                     <button
                        id="btn-nueva-categoria" // Restaurar ID
                        className="btn-agregar" // Restaurar className
                        onClick={openCategoriaModal} // Abrir modal de gestión de categorías
                    >
                        Gestionar Categorías
                    </button>
                </div>

                 {errorProductos && !isLoadingProductos && productos.length === 0 && ( // Mostrar error de tabla principal si no hay productos y no est\u00e1 cargando
                     <div className="error-message" style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}> {/* Restaurar className */}
                         {errorProductos}
                     </div>
                 )}
            </div>

             {/* Tabla de Productos */}
            <table id="productos-table"> {/* Restaurar ID */}
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Stock</th>
                        <th>Precio (S/)</th>
                        <th>Categoría</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                 {/* Cuerpo de la tabla: Renderizado condicional y dinámico */}
                <tbody id="productos-tbody"> {/* Restaurar ID */}
                   {isLoadingProductos && ( // Si está cargando productos
                        <tr className="empty-table-message"> {/* Restaurar className */}
                            <td colSpan="7" style={{ textAlign: 'center' }}>Cargando productos...</td>
                        </tr>
                    )}
                    {/* Removido el errorProducts aqu\u00ed para mostrarlo encima de la tabla en el controls-container */}
                    {!isLoadingProductos && productos.length === 0 && errorProductos === null && ( // Si no carga, no hay error Y no hay productos
                        <tr className="empty-table-message"> {/* Restaurar className */}
                            <td colSpan="7" style={{ textAlign: 'center' }}>No hay productos registrados.</td>
                        </tr>
                    )}
                     {/* Si no carga, no hay error Y hay productos, mapear y renderizar filas */}
                    {!isLoadingProductos && productos.length > 0 && (
                        productos.map(producto => { // Iterar sobre el estado 'productos'
                            const stock = parseInt(producto.stock); // Asegurarse de que sea número
                            const bajoStock = stock <= 10; // Lógica para bajo stock (usar la misma que en tu JS)

                            return (
                                <tr key={producto.id_producto}> {/* Usar 'key' única */}
                                    <td>{producto.id_producto}</td>
                                    <td>{producto.nombre}</td>
                                    <td>{producto.descripcion || '-'}</td> {/* Mostrar '-' si la descripci\u00f3n es null/vac\u00eda */}
                                    <td>
                                        {stock}
                                        {bajoStock && <span className="low-stock-indicator">(Bajo)</span>} {/* Restaurar className del indicador */}
                                    </td>
                                    <td>S/ {parseFloat(producto.precio).toFixed(2)}</td>
                                     {/* Muestra el nombre de la categoría (viene del JOIN en Node.js backend) */}
                                     {/* Si id_categoria en productos puede ser null en DB, aseg\u00farate que el backend env\u00eda categoria: null o un string vac\u00eda en ese caso */}
                                     {/* Si la categor\u00eda es opcional en DB, el LEFT JOIN en backend deber\u00eda manejarlo y devolver c.nombre = null */}
                                    <td>{producto.categoria || '-'}</td>
                                    <td>
                           {/* Botones de acción con manejadores onClick */}
                                        <button
                                            className="btn-accion btn-editar" // Restaurar className
                                            onClick={() => openProductoModal('editar', producto.id_producto)} // Abrir modal editar pasando ID
                                        >
                                            Editar
                                        </button>
                                        <button
                                            className="btn-accion btn-eliminar" // Restaurar className
                                            onClick={() => handleDeleteProducto(producto.id_producto)} // Llamar manejador eliminar
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

             {/* Controles de Paginación de Productos */}
             {/* Renderizar los botones de paginación de productos */}
            {renderPagination(totalProductos, itemsPerPageProductos, currentPageProductos, setCurrentPageProductos)}


             {/* Modal para Agregar/Editar Producto - Renderizado condicional */}
            {isProductoModalOpen && ( // Si isProductoModalOpen es true, renderiza el modal
                <div id="producto-modal" className="modal" style={{ display: 'block' }}> {/* Restaurar className y estilo */}
                    <div className="modal-content"> {/* Restaurar className */}
                         {/* Botón de cerrar modal */}
                        <span className="close-button" onClick={closeProductoModal}>&times;</span> {/* Restaurar className y manejador onClick */}
                         {/* Título del modal basado en el modo */}
                        <h3 id="modal-title">{productoModalMode === 'agregar' ? 'Agregar Producto' : 'Editar Producto'}</h3> {/* Restaurar ID */}
                         {/* Formulario del modal con manejadores y valores controlados */}
                        <form id="producto-form" onSubmit={handleProductoFormSubmit}> {/* Restaurar ID y usar onSubmit */}
                         {/* Input oculto para el ID en modo edición */}
                            {productoModalMode === 'editar' && (
                                <input type="hidden" id="id_producto" name="id_producto" value={productoFormData.id_producto || ''} readOnly /> // Restaurar ID y usar value del estado, readOnly en edici\u00f3n
                            )}

                             {/* Labels e Inputs controlados por estado */}
                            <div> {/* Agrupar para estilos */}<label htmlFor="nombre">Nombre:</label> {/* Restaurar htmlFor */}
                            <input type="text" id="nombre" name="nombre" required value={productoFormData.nombre} onChange={handleProductoFormChange} disabled={isSavingProducto} /> {/* Usar value y onChange, deshabilitar al guardar */}
                            </div>

                            <div> {/* Agrupar para estilos */}<label htmlFor="descripcion">Descripción:</label> {/* Restaurar htmlFor */}
                            <textarea id="descripcion" name="descripcion" value={productoFormData.descripcion} onChange={handleProductoFormChange} disabled={isSavingProducto}></textarea> {/* Usar value y onChange, deshabilitar al guardar */}
                            </div>

                            <div> {/* Agrupar para estilos */}<label htmlFor="stock">Stock:</label> {/* Restaurar htmlFor */}
                            <input type="number" id="stock" name="stock" required min="0" step="1" value={productoFormData.stock} onChange={handleProductoFormChange} disabled={isSavingProducto} /> {/* Usar value y onChange, deshabilitar al guardar */}
                            </div>

                            <div> {/* Agrupar para estilos */}<label htmlFor="precio">Precio (S/):</label> {/* Restaurar htmlFor */}
                            {/* Ajusta el type y step según cómo quieres manejar decimales y si quieres el teclado numérico en móvil */}
                            <input type="number" id="precio" name="precio" required step="0.01" min="0" value={productoFormData.precio} onChange={handleProductoFormChange} disabled={isSavingProducto} /> {/* Usar value y onChange, deshabilitar al guardar */}
                            </div>

                            <div> <label htmlFor="id_categoria">Categoría:</label> 
                             {/* Select de categorías - Poblado desde el estado categoriasSelect */}
                            <select id="id_categoria" name="id_categoria" required value={productoFormData.id_categoria} onChange={handleProductoFormChange} disabled={isLoadingCategoriasSelect || isSavingProducto}> {/* Usar value y onChange. Deshabilitar si cargando o guardando. */}
                                 <option value="">{isLoadingCategoriasSelect ? 'Cargando categorías...' : errorCategoriasSelect ? 'Error al cargar' : categoriasSelect.length === 0 ? 'No hay categorías' : 'Seleccione una categoría'}</option> {/* Opción de carga, error o no hay */}
                                 {!isLoadingCategoriasSelect && !errorCategoriasSelect && categoriasSelect.length > 0 && (
                                     categoriasSelect.map(cat => ( // Mapear categorías cargadas
                                          <option key={cat.id_categoria} value={cat.id_categoria}>
                                              {cat.nombre}
                                          </option>
                                     ))
                                 )}
                   </select>
                            </div>


                            {/* Mostrar error del formulario de producto si existe */}
                            {productoFormError && (
                                <div className="error-message" style={{ color: 'red', marginBottom: '15px' }}> {/* Restaurar className */}
                                    {productoFormError}
                                </div>
                            )}

                            <div className="form-buttons"> {/* Restaurar className */}
                                 {/* Botón Guardar - Deshabilitado al enviar */}
                                <button type="submit" className="btn-accion btn-guardar" disabled={isSavingProducto}> {/* Restaurar className */}
                                    {isSavingProducto ? 'Guardando...' : 'Guardar'}
                                </button>
                                 {/* Botón Cancelar */}
                                <button type="button" className="btn-accion btn-cancelar" onClick={closeProductoModal} disabled={isSavingProducto}> {/* Restaurar className */}
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


             {/* Modal para Gestión de Categorías - Renderizado condicional */}
            {isCategoriaModalOpen && ( // Si isCategoriaModalOpen es true, renderiza el modal
                 <div id="categoria-modal" className="modal" style={{ display: 'block' }}> {/* Restaurar className y estilo */}
                    <div className="modal-content modal-content-large"> {/* Restaurar className */}
                         {/* Botón de cerrar modal */}
                        <span className="close-button close-cat" onClick={closeCategoriaModal}>&times;</span> {/* Restaurar className y manejador onClick */}
                        <h3 id="modal-cat-title">Gestión de Categorías</h3> {/* Restaurar ID */}

                         {/* Formulario para Agregar Categoría */}
                        <form id="categoria-form" onSubmit={handleCategoriaFormSubmit}> {/* Restaurar ID y usar onSubmit */}
                           <div> {/* Agrupar para estilos */}
                            <label htmlFor="nombre_categoria">Nombre de la Nueva Categoría:</label> {/* Restaurar htmlFor */}
                             {/* Input controlado por estado */}
                            <input
                                type="text"
                                id="nombre_categoria" // Restaurar ID
                                name="nombre" // Nombre del campo en el estado y FormData (si usaras FormData)
                                required
                                value={categoriaFormData.nombre} // Controlar valor
                                onChange={handleCategoriaFormChange} // Manejar cambios
                                disabled={isSavingCategoria} // Deshabilitar al guardar
                            />
                             </div>
                             {/* Mostrar error del formulario de categoría si existe */}
                            {categoriaFormError && (
                                <div className="error-message" style={{ color: 'red', marginBottom: '15px', marginTop: '10px' }}> {/* Restaurar className */}
                                    {categoriaFormError}
                                </div>
                           )}
                             <div className="form-buttons" style={{marginTop: '10px'}}> {/* Restaurar className y estilo inline */}
                                 {/* Botón Agregar Categoría - Deshabilitado al enviar */}
                                <button type="submit" className="btn-accion btn-guardar" disabled={isSavingCategoria}> {/* Restaurar className */}
                                    {isSavingCategoria ? 'Agregando...' : 'Agregar Categoría'}
                                </button>
                            </div>
                        </form>

                       <hr style={{ margin: '20px 0' }}/> {/* Separador, estilo inline */}

                         {/* Lista y Búsqueda de Categorías Existentes */}
                        <div className="categories-list-container"> {/* Restaurar className */}
                             <h4>Categorías Existentes</h4>

                            <div id="search-container-cat" style={{ marginBottom: '10px' }}> {/* Restaurar ID, estilo inline */}
                                {/* Input de búsqueda de CATEGORÍAS controlado por estado */}
                                <input
                                    type="text"
                                    id="search-input-cat" // Restaurar ID
                                    placeholder="Buscar categoría por nombre..."
                                    value={searchTermCategoriasTabla} // Controlar valor
                                    onChange={handleSearchCategoriasChange} // Manejar cambios
                                />
                            </div>

                             {/* Mostrar error de tabla de categorías si existe */}
                            {errorCategoriasTabla && !isLoadingCategoriasTabla && categoriasTabla.length === 0 && (
                                <div className="error-message" style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}> {/* Restaurar className */}
                                    {errorCategoriasTabla}
                                </div>
                           )}

                            {/* Tabla de Categorías */}
                            <table id="categorias-table"> {/* Restaurar ID */}
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nombre</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                 {/* Cuerpo de la tabla: Renderizado condicional y dinámico */}
                                <tbody id="categorias-tbody"> {/* Restaurar ID */}
                                   {isLoadingCategoriasTabla && ( // Si está cargando categorías
                                        <tr className="empty-table-message"> {/* Restaurar className */}
                                            <td colSpan="3" style={{ textAlign: 'center' }}>Cargando categorías...</td>
                                        </tr>
                                    )}
                                    {/* Removido errorCategoriasTabla de aqu\u00ed */}
                                    {!isLoadingCategoriasTabla && categoriasTabla.length === 0 && errorCategoriasTabla === null && ( // Si no carga, no hay error Y no hay categorías
                                        <tr className="empty-table-message"> {/* Restaurar className */}
                                            <td colSpan="3" style={{ textAlign: 'center' }}>No hay categorías registradas.</td>
                                        </tr>
                                    )}
                                     {/* Si no carga, no hay error Y hay categorías, mapear y renderizar filas */}
                                   {!isLoadingCategoriasTabla && categoriasTabla.length > 0 && (
                                        categoriasTabla.map(cat => ( // Iterar sobre el estado 'categoriasTabla'
                                          <tr key={cat.id_categoria}> {/* Usar 'key' única */}
                                                <td>{cat.id_categoria}</td>
                                                <td>{cat.nombre}</td>
                                                <td>
                                             {/* Botón Eliminar Categoría */}
                                                     <button
                                                        className="btn-accion btn-eliminar btn-eliminar-cat" // Restaurar className
                                                        onClick={() => handleDeleteCategoria(cat.id_categoria)} // Llamar manejador eliminar
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                       {/* Controles de Paginación de Categorías */}
                             {/* Renderizar los botones de paginación de categorías */}
                            {renderPagination(totalCategoriasTabla, itemsPerPageCategoriasTabla, currentPageCategoriasTabla, setCurrentPageCategoriasTabla)}

                     </div>

                        <div className="form-buttons modal-close-footer"> {/* Restaurar className */}
                             {/* Botón Cerrar Modal Categoría */}
                            <button type="button" className="btn-accion btn-cancelar btn-cancelar-cat" onClick={closeCategoriaModal}> {/* Restaurar className */}
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
             )}
        </main>
    );
}

export default ProductoPage;