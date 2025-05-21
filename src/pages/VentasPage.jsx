
// src/pages/VentasPage.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const VENTAS_API_ENDPOINT = `${API_BASE_URL}/ventas`;

const ITEMS_PER_PAGE_VENTAS = 10;
const ITEMS_PER_PAGE_DETALLES = 5;


function VentasPage() {
    const { token, isLoggedIn, logout, idUsuario: loggedInUserId, username: loggedInUsername } = useContext(AuthContext);

    const [ventas, setVentas] = useState([]);
    const [isLoadingVentas, setIsLoadingVentas] = useState(true);
    const [errorVentas, setErrorVentas] = useState(null);

    const [currentPageVentas, setCurrentPageVentas] = useState(1);
    const [totalVentas, setTotalVentas] = useState(0);
    const [refreshVentasTrigger, setRefreshVentasTrigger] = useState(0);

    const [searchTermVentas, setSearchTermVentas] = useState('');

    const [isVentaModalOpen, setIsVentaModalOpen] = useState(false);
    const [ventaModalMode, setVentaModalMode] = useState('agregar');
    const [editingVentaId, setEditingVentaId] = useState(null);

    const [clientesSelect, setClientesSelect] = useState([]);
    const [productosSelect, setProductosSelect] = useState([]);

    const [isLoadingModalData, setIsLoadingModalData] = useState(false);
    const [errorModalData, setErrorModalData] = useState(null);

    const [ventaFormData, setVentaFormData] = useState({
        id_venta: '',
        id_cliente: '',
        id_usuario: loggedInUserId || '',
        fecha: '',
    });
    const [productosEnVentaForm, setProductosEnVentaForm] = useState([]);
    const [ventaFormError, setVentaFormError] = useState(null);
    const [isSavingVenta, setIsSavingVenta] = useState(false);

    const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState('');
    const [cantidadProductoToAdd, setCantidadProductoToAdd] = useState(1);
    const [selectedProductStock, setSelectedProductStock] = useState(0);

    const [isDetalleVentaModalOpen, setIsDetalleVentaModalOpen] = useState(false);
    const [viewingVentaId, setViewingVentaId] = useState(null);
    const [detalleVentaView, setDetalleVentaView] = useState(null);
    const [detalleProductosView, setDetalleProductosView] = useState([]);
    const [isLoadingDetalleView, setIsLoadingDetalleView] = useState(true);
    const [errorDetalleView, setErrorDetalleView] = useState(null);

    const [currentPageDetallesView, setCurrentPageDetallesView] = useState(1);
    const [currentPageDetallesForm, setCurrentPageDetallesForm] = useState(1);

    const totalVentaCalculado = productosEnVentaForm.reduce((sum, item) => sum + (parseFloat(item.precio_unitario || 0) * parseInt(item.cantidad || 0)), 0);

    const renderVendedorDisplay = () => {
         return loggedInUsername || 'N/A';
    };

    const renderPagination = (totalItems, itemsPerPage, currentPage, setCurrentPageFunc) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (totalPages <= 1) {
            return null;
        }

        const buttons = [];
        buttons.push(
            <button type="button" key="prev" disabled={currentPage === 1} onClick={() => setCurrentPageFunc(currentPage - 1)} className="btn-accion pagination-btn">
                « Anterior
            </button>
        );

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
             buttons.push(<button type="button" key={1} className="btn-accion pagination-btn" onClick={() => setCurrentPageFunc(1)}>1</button>);
             if (startPage > 2) {
                 buttons.push(<span key="ellipsis-start" className="pagination-info">...</span>);
             }
        }

        for (let i = startPage; i <= endPage; i++) {
            buttons.push(
                <button
                    type="button"
                    key={i}
                    className={`btn-accion pagination-btn${i === currentPage ? ' active current-page' : ''}`}
                    onClick={() => setCurrentPageFunc(i)}
                >
                    {i}
                </button>
            );
        }

        if (endPage < totalPages) {
             if (endPage < totalPages - 1) {
                 buttons.push(<span key="ellipsis-end" className="pagination-info">...</span>);
             }
             buttons.push(<button type="button" key={totalPages} className="btn-accion pagination-btn" onClick={() => setCurrentPageFunc(totalPages)}>{totalPages}</button>);
        }


        buttons.push(
            <button type="button" key="next" disabled={currentPage === totalPages} onClick={() => setCurrentPageFunc(currentPage + 1)} className="btn-accion pagination-btn">
                Siguiente »
            </button>
        );

        return <div className="pagination-controls">{buttons}</div>;
    };

    // --- Fetch de datos de ventas para la tabla principal ---
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const fetchVentas = useCallback(async () => {
        if (!isLoggedIn || !token) {
             setIsLoadingVentas(false);
             setVentas([]);
             setTotalVentas(0);
             return;
        }

        setIsLoadingVentas(true);
        setErrorVentas(null);

        try {
            const queryParams = new URLSearchParams({
                 action: 'listar',
                 page: currentPageVentas,
                 limit: ITEMS_PER_PAGE_VENTAS,
            });

            if (searchTermVentas) {
                 queryParams.append('search', searchTermVentas);
            }

            const url = `${VENTAS_API_ENDPOINT}?${queryParams.toString()}`;
            console.log('Fetching ventas:', url);

            const response = await fetch(url, {
                 method: 'GET',
                 headers: {
                     'Authorization': `Bearer ${token}`,
                     'Content-Type': 'application/json',
                 },
            });

            if (!response.ok) {
                 if (response.status === 401 || response.status === 403) {
                      console.error('API returned 401/403 on fetching ventas. Logging out.');
                      if(logout) logout();
                      setErrorVentas('Sesión expirada o no autorizado para ver ventas.');
                 } else {
                      const errorBody = await response.text();
                      console.error('Error fetching ventas HTTP:', response.status, errorBody);
                       try {
                           const errorJson = JSON.parse(errorBody);
                           if (errorJson && errorJson.message) {
                                setErrorVentas(errorJson.message);
                                return;
                           }
                       } catch (e) { }
                      setErrorVentas(`Error al cargar ventas: ${response.status}`);
                 }
                 setVentas([]);
                 setTotalVentas(0);
                 setIsLoadingVentas(false);
                 return;
            }

            const result = await response.json();

             if (!result || typeof result.success === 'undefined' || !result.success || typeof result.total === 'undefined' || !Array.isArray(result.data)) {
                 const apiErrorMessage = result?.message || 'Formato de respuesta de ventas incorrecto o API reportó error.';
                 console.error('API error fetching ventas:', apiErrorMessage, result);
                 setErrorVentas(apiErrorMessage);
                 setVentas([]);
                 setTotalVentas(0);

             } else {
                 setVentas(result.data);
                 setTotalVentas(result.total);

                 const totalPagesAfterFetch = Math.ceil(result.total / ITEMS_PER_PAGE_VENTAS);
                 if (currentPageVentas > totalPagesAfterFetch && result.total > 0) {
                      setCurrentPageVentas(totalPagesAfterFetch > 0 ? totalPagesAfterFetch : 1);
                  } else if (currentPageVentas > 1 && result.total === 0) {
                     setCurrentPageVentas(1);
                 }
             }


        } catch (fetchError) {
            console.error('Error al cargar ventas:', fetchError);
            setErrorVentas(`Error de conexi\u00f3n al cargar ventas: ${fetchError.message}`);
            setVentas([]);
            setTotalVentas(0);
        } finally {
            setIsLoadingVentas(false);
        }
    }, [currentPageVentas, searchTermVentas, refreshVentasTrigger, token, isLoggedIn, logout]);


    // --- Fetch de datos para los selectores del modal (clientes, productos) ---
    const fetchModalData = useCallback(async () => {
        if (!isLoggedIn || !token) {
             setIsLoadingModalData(false);
             setClientesSelect([]);
             setProductosSelect([]);
             setErrorModalData("Debes iniciar sesi\u00f3n para cargar datos del formulario.");
             return;
        }

        setIsLoadingModalData(true);
        setErrorModalData(null);
        setClientesSelect([]);
        setProductosSelect([]);

        try {
            const url = `${VENTAS_API_ENDPOINT}?action=get_modal_data`;
             console.log('Fetching modal data:', url);

            const response = await fetch(url, {
                 method: 'GET',
                 headers: {
                     'Authorization': `Bearer ${token}`,
                     'Content-Type': 'application/json',
                 },
            });

            if (!response.ok) {
                 if (response.status === 401 || response.status === 403) {
                      console.error('API returned 401/403 on fetching modal data.');
                      if(logout) logout();
                      setErrorModalData('Sesión expirada o no autorizado para cargar datos del formulario.');
                 } else {
                      const errorBody = await response.text();
                      console.error('Error fetching modal data HTTP:', response.status, errorBody);
                       try {
                           const errorJson = JSON.parse(errorBody);
                           if (errorJson && errorJson.message) {
                                setErrorModalData(errorJson.message);
                                return;
                           }
                       } catch (e) { }
                      setErrorModalData(`Error al cargar datos del formulario: ${response.status}`);
                 }
                 setClientesSelect([]);
                 setProductosSelect([]);
                 return;
            }

            const result = await response.json();

            if (!result || !result.success || !Array.isArray(result.clients) || !Array.isArray(result.sellers) || !Array.isArray(result.products)) {
                const apiErrorMessage = result?.message || 'Formato de respuesta de datos del modal incorrecto o API reportó error.';
                console.error('API error fetching modal data:', apiErrorMessage, result);
                setErrorModalData(apiErrorMessage);
                setClientesSelect([]);
                setProductosSelect([]);

            } else {
                setClientesSelect(result.clients);
                setProductosSelect(result.products);
            }


        } catch (fetchError) {
            console.error('Error al cargar datos para el modal de venta:', fetchError);
            setErrorModalData(`Error de conexi\u00f3n al cargar datos del formulario: ${fetchError.message}`);
            setClientesSelect([]);
            setProductosSelect([]);
        } finally {
            setIsLoadingModalData(false);
        }
    }, [token, isLoggedIn, logout]);


    // --- Fetch de detalles de venta para el modal de vista ---
    const fetchDetallesVenta = useCallback(async (ventaId) => {
         if (!isLoggedIn || !token) {
              setErrorDetalleView("Debes iniciar sesi\u00f3n para ver detalles de venta.");
              setIsLoadingDetalleView(false);
              setDetalleVentaView(null);
              setDetalleProductosView([]);
              return;
         }

        setIsLoadingDetalleView(true);
        setErrorDetalleView(null);
        setDetalleVentaView(null);
        setDetalleProductosView([]);

        if (!ventaId) {
             setErrorDetalleView('ID de venta no proporcionado.');
             setIsLoadingDetalleView(false);
             return;
        }

        const urlVenta = `${VENTAS_API_ENDPOINT}?action=obtener&id=${ventaId}`;
        const urlDetalles = `${VENTAS_API_ENDPOINT}?action=obtener_detalles&id_venta=${ventaId}`;
         console.log('Fetching main sale data for details view:', urlVenta);
         console.log('Fetching product details for details view:', urlDetalles);


        try {
             const [ventaResponse, detallesResponse] = await Promise.all([
                  fetch(urlVenta, {
                       method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', },
                  }),
                  fetch(urlDetalles, {
                       method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', },
                  })
             ]);

             if (!ventaResponse.ok) {
                  const errorBody = await ventaResponse.text();
                  console.error(`Error fetching main sale details (ID: ${ventaId}) HTTP:`, ventaResponse.status, errorBody);
                   if (ventaResponse.status === 401 || ventaResponse.status === 403) { if(logout) logout(); setErrorDetalleView('Sesión expirada.'); return; }
                   try { const errorJson = JSON.parse(errorBody); if (errorJson && errorJson.message) { setErrorDetalleView(errorJson.message); return; } } catch (e) { }
                  throw new Error(`Error HTTP al obtener datos de la venta: ${ventaResponse.status}`);
             }
             if (!detallesResponse.ok) {
                  const errorBody = await detallesResponse.text();
                  console.error(`Error fetching sale product details (ID: ${ventaId}) HTTP:`, detallesResponse.status, errorBody);
                   if (detallesResponse.status === 401 || detallesResponse.status === 403) { if(logout) logout(); setErrorDetalleView('Sesión expirada.'); return; }
                   try { const errorJson = JSON.parse(errorBody); if (errorJson && errorJson.message) { setErrorDetalleView(errorJson.message); return; } } catch (e) { }
                  throw new Error(`Error HTTP al obtener detalles de productos de la venta: ${detallesResponse.status}`);
             }

             const ventaResult = await ventaResponse.json();
             const detallesResult = await detallesResponse.json();

             if (!ventaResult || typeof ventaResult.id_venta === 'undefined') {
                  const apiErrorMessage = ventaResult?.message || ventaResult?.error || 'Formato incorrecto de datos de la venta.';
                  console.error('API error fetching main sale details:', apiErrorMessage, ventaResult);
                  setErrorDetalleView(apiErrorMessage);
                  setDetalleVentaView(null);
                  setDetalleProductosView([]);
                  return;
             }
             if (!detallesResult || !Array.isArray(detallesResult)) {
                  const apiErrorMessage = detallesResult?.message || 'Error al obtener detalles de productos o formato incorrecto.';
                  console.error('API error fetching sale product details:', apiErrorMessage, detallesResult);
                  setErrorDetalleView(apiErrorMessage);
                   setDetalleVentaView(null);
                   setDetalleProductosView([]);
                  return;
             }

             setDetalleVentaView(ventaResult);
             setDetalleProductosView(detallesResult);


        } catch (fetchError) {
            console.error(`Error al cargar detalles de la venta (ID: ${ventaId}):`, fetchError);
            setErrorDetalleView(`Error de conexi\u00f3n al cargar detalles: ${fetchError.message}`);
            setDetalleVentaView(null);
            setDetalleProductosView([]);
        } finally {
            setIsLoadingDetalleView(false);
        }
    }, [token, isLoggedIn, logout]);


    const openVentaModal = (mode, ventaId = null) => {
        setVentaModalMode(mode);
        setEditingVentaId(ventaId);
        setVentaFormError(null);
        setIsSavingVenta(false);

        if (mode === 'agregar') {
            const today = new Date().toISOString().split('T')[0];
             setVentaFormData({
                 id_venta: '',
                 id_cliente: '',
                 id_usuario: loggedInUserId || '',
                 fecha: today,
             });
             setProductosEnVentaForm([]);
        } else {
        }

        setIsVentaModalOpen(true);
    };

    const closeVentaModal = () => {
        setIsVentaModalOpen(false);
        setEditingVentaId(null);
        setVentaFormError(null);
        setIsSavingVenta(false);
        setVentaModalMode('agregar');
         setVentaFormData({
             id_venta: '', id_cliente: '', id_usuario: loggedInUserId || '', fecha: '',
         });
        setProductosEnVentaForm([]);

        setSelectedProductIdToAdd('');
        setCantidadProductoToAdd(1);
        setSelectedProductStock(0);
         setCurrentPageDetallesForm(1);
         setErrorModalData(null);
    };

     const openDetalleVentaModal = (ventaId) => {
         setViewingVentaId(ventaId);
         setIsDetalleVentaModalOpen(true);
     };

     const closeDetalleVentaModal = () => {
         setIsDetalleVentaModalOpen(false);
         setViewingVentaId(null);
         setDetalleVentaView(null);
         setDetalleProductosView([]);
         setIsLoadingDetalleView(true);
         setErrorDetalleView(null);
         setCurrentPageDetallesView(1);
     };


    useEffect(() => {
         if (isLoggedIn) {
              fetchVentas();
         } else {
              setVentas([]);
              setTotalVentas(0);
              setIsLoadingVentas(false);
              setErrorVentas('Debes iniciar sesión para ver las ventas.');
         }
    }, [fetchVentas, isLoggedIn]);

    useEffect(() => {
        if (isVentaModalOpen) {
            fetchModalData();
        } else {
            setErrorModalData(null);
            setIsLoadingModalData(false);
            setClientesSelect([]);
            setProductosSelect([]);
        }
    }, [isVentaModalOpen, fetchModalData]);


    useEffect(() => {
         if (isDetalleVentaModalOpen && viewingVentaId !== null) {
             fetchDetallesVenta(viewingVentaId);
         } else {
             setDetalleVentaView(null);
             setDetalleProductosView([]);
             setIsLoadingDetalleView(true);
             setErrorDetalleView(null);
             setCurrentPageDetallesView(1);
         }
    }, [isDetalleVentaModalOpen, viewingVentaId, fetchDetallesVenta]);


    const handleVentaFormChange = (e) => {
        const { name, value } = e.target;
        setVentaFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleProductoSelectorChange = (e) => {
        const productId = e.target.value;
        setSelectedProductIdToAdd(productId);
        setCantidadProductoToAdd(1);
        const selectedProduct = productosSelect.find(p => String(p.id_producto) === String(productId));
        setSelectedProductStock(selectedProduct ? parseInt(selectedProduct.stock) : 0);
         setVentaFormError(null);
    };

    const handleCantidadProductoChange = (e) => {
        const value = e.target.value;
        const parsedValue = parseInt(value);

         setCantidadProductoToAdd(value);
         setVentaFormError(null);

         if (selectedProductIdToAdd && !isNaN(parsedValue) && parsedValue > 0) {
             const productToAdd = productosSelect.find(p => String(p.id_producto) === String(selectedProductIdToAdd));
              if (productToAdd && parsedValue > parseInt(productToAdd.stock)) {
                   setVentaFormError(`Cantidad excede el stock disponible (${productToAdd.stock}).`);
              }
         }
    };

    const handleAddProductoToSaleForm = () => {
        setVentaFormError(null);

        if (!selectedProductIdToAdd) {
            setVentaFormError('Seleccione un producto para agregar.');
            return;
        }

        const productToAdd = productosSelect.find(p => String(p.id_producto) === String(selectedProductIdToAdd));
        const cantidad = parseInt(cantidadProductoToAdd);

        if (!productToAdd || cantidad <= 0 || isNaN(cantidad)) {
             setVentaFormError('Error al agregar producto. Verifique la selecci\u00f3n y cantidad (debe ser un n\u00famero entero positivo).');
             return;
        }

        const currentQuantityInForm = productosEnVentaForm.reduce((sum, item) =>
            String(item.id_producto) === String(selectedProductIdToAdd) ? sum + parseInt(item.cantidad) : sum, 0);

        const totalQuantityRequested = currentQuantityInForm + cantidad;

         if (totalQuantityRequested > parseInt(productToAdd.stock)) {
              setVentaFormError(`La cantidad total solicitada (${totalQuantityRequested}) para "${productToAdd.nombre}" excede el stock disponible (${productToAdd.stock}).`);
              return;
         }


        setProductosEnVentaForm(prevProducts => {
            const existingItemIndex = prevProducts.findIndex(item => String(item.id_producto) === String(selectedProductIdToAdd));
            const newProductsList = [...prevProducts];

            if (existingItemIndex !== -1) {
                newProductsList[existingItemIndex].cantidad += cantidad;
                newProductsList[existingItemIndex].subtotal = newProductsList[existingItemIndex].cantidad * parseFloat(productToAdd.precio);
            } else {
                newProductsList.push({
                     id_producto: String(productToAdd.id_producto),
                     nombre_producto: productToAdd.nombre,
                     cantidad: cantidad,
                     precio_unitario: parseFloat(productToAdd.precio),
                     subtotal: cantidad * parseFloat(productToAdd.precio),
                });
            }
            newProductsList.sort((a, b) => a.nombre_producto.localeCompare(b.nombre_producto));
            setVentaFormError(null);

            return newProductsList;
        });

        setSelectedProductIdToAdd('');
        setCantidadProductoToAdd(1);
        setSelectedProductStock(0);
    };

    const handleRemoveProductoFromSaleForm = (indexToRemove) => {
        setProductosEnVentaForm(prevProducts => {
            const newProductsList = prevProducts.filter((_, index) => index !== indexToRemove);
            setVentaFormError(null);
             const totalItemsAfterRemove = newProductsList.length;
             const totalPagesAfterRemove = Math.ceil(totalItemsAfterRemove / ITEMS_PER_PAGE_DETALLES);
             if (currentPageDetallesForm > totalPagesAfterRemove && totalItemsAfterRemove > 0) {
                 setCurrentPageDetallesForm(totalPagesAfterRemove > 0 ? totalPagesAfterRemove : 1);
             } else if (currentPageDetallesForm > 1 && totalItemsAfterRemove === 0) {
                 setCurrentPageDetallesForm(1);
             }
            return newProductsList;
        });
    };

    const handleVentaFormSubmit = async (event) => {
        event.preventDefault();

        if (!isLoggedIn || !token) {
            console.warn("Attempted to save sale without being logged in.");
            if(logout) logout();
            setIsSavingVenta(false);
            return;
        }


        setIsSavingVenta(true);
        setVentaFormError(null);

        if (!ventaFormData.id_cliente || !ventaFormData.fecha) {
             setVentaFormError('Por favor, complete Cliente y Fecha.');
             setIsSavingVenta(false);
             return;
         }
         if (productosEnVentaForm.length === 0) {
             setVentaFormError('Agregue al menos un producto a la venta.');
             setIsSavingVenta(false);
             return;
         }

         const invalidItems = productosEnVentaForm.some(item =>
             !item || item.cantidad <= 0 || isNaN(item.cantidad) ||
             !item.id_producto || isNaN(parseInt(item.id_producto)) || parseInt(item.id_producto) <= 0 ||
             isNaN(item.precio_unitario) || item.precio_unitario < 0
         );
         if (invalidItems) {
              setVentaFormError('Hay productos con cantidad, precio unitario o ID inv\u00e1lido(s) en la lista.');
              setIsSavingVenta(false);
              return;
         }


        const action = ventaModalMode === 'agregar' ? 'agregar' : 'actualizar';

        try {
            const dataToSend = {
                action: action,
                ...(action === 'actualizar' && { id_venta: parseInt(ventaFormData.id_venta) }),
                id_cliente: parseInt(ventaFormData.id_cliente),
                id_usuario: parseInt(loggedInUserId),
                fecha: ventaFormData.fecha,
                total: parseFloat(totalVentaCalculado).toFixed(2),
                productos: productosEnVentaForm.map(item => ({
                    id_producto: parseInt(item.id_producto),
                    cantidad: parseInt(item.cantidad),
                    precio_unitario: parseFloat(item.precio_unitario),
                }))
            };

            console.log(`Datos de venta a enviar para ${action}:`, dataToSend);
            console.log(`Sending POST request to: ${VENTAS_API_ENDPOINT}`);

            const response = await fetch(VENTAS_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(dataToSend),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Error HTTP ${response.status} during sale ${action}:`, errorBody);
                 if (response.status === 401 || response.status === 403) { if(logout) logout(); setVentaFormError('Sesión expirada.'); return; }
                 try {
                     const errorJson = JSON.parse(errorBody);
                     if (errorJson && errorJson.message) {
                         setVentaFormError(errorJson.message);
                         return;
                     }
                 } catch (e) { }
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                closeVentaModal();

                if(action === 'agregar') {
                     setCurrentPageVentas(1);
                 } else {
                     setRefreshVentasTrigger(prev => prev + 1);
                 }

            } else {
                console.warn(`API reported error during sale ${action}:`, result.message);
                setVentaFormError(result.message || `Error al ${action === 'agregar' ? 'registrar' : 'actualizar'} la venta.`);
            }

        } catch (fetchError) {
            console.error(`Workspace error during sale ${action}:`, fetchError);
            setVentaFormError(`Error de conexi\u00f3n: ${fetchError.message}. Intente m\u00e1s tarde.`);
        } finally {
            setIsSavingVenta(false);
        }
    };

    const handleDeleteVenta = async (ventaId) => {
        if (!isLoggedIn || !token) {
             console.warn("Attempted to delete sale without being logged in.");
             if(logout) logout();
             return;
        }

        setErrorVentas(null);

        try {
            const fetchOptions = {
                method: 'POST',
                headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ action: 'eliminar', id_venta: ventaId })
            };

            console.log(`Deleting sale ID: ${ventaId}`);
            console.log(`Sending POST request to: ${VENTAS_API_ENDPOINT} with payload:`, { action: 'eliminar', id_venta: ventaId });

            const response = await fetch(VENTAS_API_ENDPOINT, fetchOptions);

            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error(`Error HTTP ${response.status} during sale deletion (ID: ${ventaId}):`, errorBody);
                  if (response.status === 401 || response.status === 403) { if(logout) logout(); setErrorVentas('Sesión expirada.'); return; }
                  try {
                      const errorJson = JSON.parse(errorBody);
                      if (errorJson && errorJson.message) {
                          setErrorVentas(errorJson.message);
                          return;
                      }
                  } catch (e) { }
                 throw new Error(`Error HTTP: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {

                 const totalPagesAfterDelete = Math.ceil((totalVentas - 1) / ITEMS_PER_PAGE_VENTAS);
                  if (currentPageVentas > totalPagesAfterDelete && currentPageVentas > 1) {
                      setCurrentPageVentas(totalPagesAfterDelete > 0 ? totalPagesAfterDelete : 1);
                  } else {
                      setRefreshVentasTrigger(prev => prev + 1);
                  }


            } else {
                console.warn(`API reported error during sale deletion (ID: ${ventaId}):`, result.message);
                setErrorVentas(result.message || 'Error al eliminar la venta.');
            }

        } catch (fetchError) {
            console.error(`Workspace error during sale deletion (ID: ${ventaId}):`, fetchError);
            setErrorVentas(`Error de conexi\u00f3n al eliminar venta: ${fetchError.message}.`);
        }
    };

    const handleEditVentaClick = async (ventaId) => {
         if (!isLoggedIn || !token) {
               console.warn("Attempted to edit sale without being logged in.");
               if(logout) logout();
               return;
         }
         setVentaFormError(null);
         setIsSavingVenta(false);

         setIsLoadingModalData(true);
         setErrorModalData(null);
         setProductosEnVentaForm([]);

          const urlVenta = `${VENTAS_API_ENDPOINT}?action=obtener&id=${ventaId}`;
          const urlDetalles = `${VENTAS_API_ENDPOINT}?action=obtener_detalles&id_venta=${ventaId}`;
           console.log('Fetching main sale data for edit modal:', urlVenta);
           console.log('Fetching product details for edit modal:', urlDetalles);


         try {
              const [ventaResponse, detallesResponse] = await Promise.all([
                  fetch(urlVenta, {
                       method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', },
                  }),
                  fetch(urlDetalles, {
                       method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', },
                  })
             ]);


              if (!ventaResponse.ok) {
                   const errorBody = await ventaResponse.text();
                   console.error(`Error fetching sale for edit (ID: ${ventaId}) HTTP:`, ventaResponse.status, errorBody);
                    if (ventaResponse.status === 401 || ventaResponse.status === 403) { if(logout) logout(); setErrorModalData('Sesión expirada.'); return; }
                    try { const errorJson = JSON.parse(errorBody); if (errorJson && errorJson.message) { setErrorModalData(errorJson.message); return; } } catch (e) { }
                   throw new Error(`Error HTTP al obtener datos de la venta para editar: ${ventaResponse.status}`);
              }

              const ventaResult = await ventaResponse.json();


              if (!ventaResult || typeof ventaResult.id_venta === 'undefined') {
                   const apiErrorMessage = ventaResult?.message || ventaResult?.error || 'Venta no encontrada o formato incorrecto.';
                   console.error('API error fetching sale for edit:', apiErrorMessage, ventaResult);
                   setErrorModalData(apiErrorMessage);
                   setIsVentaModalOpen(false);
                   setEditingVentaId(null);
                   setVentaFormData({ id_venta: '', id_cliente: '', id_usuario: loggedInUserId || '', fecha: '', });
                   setProductosEnVentaForm([]);
                   return;
               }

               setVentaFormData({
                    id_venta: ventaResult.id_venta || '',
                    id_cliente: ventaResult.id_cliente || '',
                    id_usuario: ventaResult.id_usuario || loggedInUserId || '',
                    fecha: ventaResult.fecha ? ventaResult.fecha.split('T')[0] : '',
               });
               setEditingVentaId(ventaResult.id_venta);

               if (!detallesResponse.ok) {
                    const errorBody = await detallesResponse.text();
                    console.error(`Error fetching sale product details for edit (ID: ${ventaId}) HTTP:`, detallesResponse.status, errorBody);
                     if (detallesResponse.status === 401 || detallesResponse.status === 403) { if(logout) logout(); setErrorModalData('Sesión expirada.'); return; }
                     try { const errorJson = JSON.parse(errorBody); if (errorJson && errorJson.message) { setErrorModalData(errorJson.message); return; } } catch (e) { }
                    throw new Error(`Error HTTP al obtener detalles de productos para editar: ${detallesResponse.status}`);
               }

               const detallesResult = await detallesResponse.json();

               if (!detallesResult || !Array.isArray(detallesResult)) {
                    const apiErrorMessage = detallesResult?.message || 'Error al obtener detalles de productos o formato incorrecto.';
                    console.error('API error fetching sale product details for edit:', apiErrorMessage, detallesResult);
                    setErrorModalData(apiErrorMessage);
                    setIsVentaModalOpen(false);
                    setEditingVentaId(null);
                    setVentaFormData({ id_venta: '', id_cliente: '', id_usuario: loggedInUserId || '', fecha: '', });
                     setProductosEnVentaForm([]);
                    return;
               }

               setProductosEnVentaForm(detallesResult.map(item => ({
                    id_detalle: item.id_detalle,
                    id_producto: item.id_producto,
                    nombre_producto: item.nombre_producto,
                    cantidad: parseInt(item.cantidad),
                    precio_unitario: parseFloat(item.precio_unitario),
                    subtotal: parseFloat(item.subtotal),
               })));

               setVentaModalMode('editar');
               setIsVentaModalOpen(true);


          } catch (fetchError) {
               console.error(`Error al cargar datos de la venta para editar (ID: ${ventaId}):`, fetchError);
               setErrorModalData(`Error de conexi\u00f3n al cargar datos para editar: ${fetchError.message}.`);
               setIsVentaModalOpen(false);
               setEditingVentaId(null);
               setVentaFormData({
                   id_venta: '', id_cliente: '', id_usuario: loggedInUserId || '', fecha: '',
               });
               setProductosEnVentaForm([]);
          } finally {
              setIsLoadingModalData(false);
          }
    };


    const handleSearchVentasChange = (event) => {
        const newSearchTerm = event.target.value;
        setSearchTermVentas(newSearchTerm);
        setCurrentPageVentas(1);
    };


     const startIndexDetallesView = (currentPageDetallesView - 1) * ITEMS_PER_PAGE_DETALLES;
     const endIndexDetallesView = startIndexDetallesView + ITEMS_PER_PAGE_DETALLES;
     const currentDetallesView = detalleProductosView.slice(startIndexDetallesView, endIndexDetallesView);

     const startIndexDetallesForm = (currentPageDetallesForm - 1) * ITEMS_PER_PAGE_DETALLES;
     const endIndexDetallesForm = startIndexDetallesForm + ITEMS_PER_PAGE_DETALLES;
     const currentDetallesForm = productosEnVentaForm.slice(startIndexDetallesForm, endIndexDetallesForm);


    return (
        <main className="container6">
            <h2 className="Listado">Gestión de Ventas</h2>

            <div className="controls-container">
                <div id="search-container">
                    <input
                        type="text"
                        id="search-input"
                        placeholder="Buscar ventas por cliente o fecha..."
                        value={searchTermVentas}
                        onChange={handleSearchVentasChange}
                    />
                </div>

                <div className="buttons-row">
                    <button
                        id="btn-nueva-venta"
                        className="btn-agregar"
                        onClick={() => openVentaModal('agregar')}
                    >
                        Registrar Nueva Venta
                    </button>
                </div>

                 {errorVentas && !isLoadingVentas && ventas.length === 0 && (
                      <div className="error-message" style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>
                          {errorVentas}
                      </div>
                  )}

            </div>

            <table id="ventas-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Vendedor</th>
                        <th>Fecha</th>
                        <th>Total (S/)</th>
                        <th>Productos</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="ventas-tbody">
                     {isLoadingVentas && (
                         <tr className="empty-table-message">
                             <td colSpan="7" style={{ textAlign: 'center' }}>Cargando ventas...</td>
                         </tr>
                     )}
                     {!isLoadingVentas && !errorVentas && ventas.length === 0 && (
                         <tr className="empty-table-message">
                             <td colSpan="7" style={{ textAlign: 'center' }}>No hay ventas registradas.</td>
                         </tr>
                     )}

                     {!isLoadingVentas && !errorVentas && ventas.length > 0 && (
                          ventas.map(venta => (
                              <tr key={venta.id_venta}>
                                   <td>{venta.id_venta}</td>
                                   <td>{venta.cliente_nombre}</td>
                                   <td>{venta.vendedor_nombre}</td>
                                   <td>{venta.fecha}</td>
                                   <td>{parseFloat(venta.total).toFixed(2)}</td>
                                   <td>
                                        <button
                                             type="button"
                                             className="btn-accion btn-ver-detalles"
                                             onClick={() => openDetalleVentaModal(venta.id_venta)}
                                        >
                                             Ver Productos
                                        </button>
                                   </td>
                                   <td>
                                        <button
                                             type="button"
                                             className="btn-accion btn-editar"
                                             onClick={() => handleEditVentaClick(venta.id_venta)}
                                        >
                                             Editar
                                        </button>
                                        <button
                                             type="button"
                                             className="btn-accion btn-eliminar"
                                             onClick={() => handleDeleteVenta(venta.id_venta)}
                                        >
                                             Eliminar
                                        </button>
                                   </td>
                              </tr>
                          ))
                     )}
                </tbody>
            </table>

            {renderPagination(totalVentas, ITEMS_PER_PAGE_VENTAS, currentPageVentas, setCurrentPageVentas)}


            {isVentaModalOpen && (
                <div id="venta-modal" className="modal" style={{ display: 'block' }}>
                    <div className="modal-content modal-content-large">
                        <span className="close-button" onClick={closeVentaModal}>&times;</span>
                        <h3 id="modal-title">{ventaModalMode === 'agregar' ? 'Registrar Nueva Venta' : `Editar Venta ID: ${editingVentaId}`}</h3>
                        <form id="venta-form" onSubmit={handleVentaFormSubmit}>
                            {ventaModalMode === 'editar' && (
                                 <input type="hidden" id="id_venta" name="id_venta" value={ventaFormData.id_venta} readOnly />
                            )}

                             {isLoadingModalData && <p style={{ textAlign: 'center' }}>Cargando datos del formulario...</p>}
                             {errorModalData && <p style={{ color: 'red', textAlign: 'center' }}>Error: {errorModalData}</p>}

                            {!isLoadingModalData && !errorModalData && (
                                 <>
                                     <div className="form-row">
                                          <label htmlFor="id_cliente">Cliente:</label>
                                          <select
                                              id="id_cliente"
                                              name="id_cliente"
                                              required
                                              value={ventaFormData.id_cliente}
                                              onChange={handleVentaFormChange}
                                              disabled={isSavingVenta}
                                          >
                                               <option value="">Seleccionar cliente...</option>
                                               {clientesSelect.map(cliente => (
                                                    <option key={cliente.id_cliente} value={cliente.id_cliente}>
                                                         {cliente.nombre}
                                                    </option>
                                               ))}
                                          </select>
                                     </div>

                                     <div className="form-row">
                                          <label htmlFor="id_usuario">Vendedor:</label>
                                          <span id="vendedor-nombre-display">{renderVendedorDisplay()}</span>
                                          <input
                                              type="hidden"
                                              id="id_usuario"
                                              name="id_usuario"
                                              value={loggedInUserId || ''}
                                              readOnly
                                          />
                                     </div>

                                     <div className="form-row">
                                          <label htmlFor="fecha">Fecha:</label>
                                          <input
                                              type="date"
                                              id="fecha"
                                              name="fecha"
                                              required
                                              value={ventaFormData.fecha}
                                              onChange={handleVentaFormChange}
                                              disabled={isSavingVenta}
                                          />
                                     </div>

                                     <div className="productos-venta">
                                          <h4>Productos de la Venta</h4>

                                          <div className="add-producto-row">
                                               <select
                                                   id="producto-selector"
                                                   value={selectedProductIdToAdd}
                                                   onChange={handleProductoSelectorChange}
                                                    disabled={isSavingVenta || productosSelect.length === 0}
                                               >
                                                    <option value="">Seleccionar producto...</option>
                                                    {productosSelect.map(producto => (
                                                         <option key={producto.id_producto} value={producto.id_producto}>
                                                             {producto.nombre} (Stock: {producto.stock}) (S/ {parseFloat(producto.precio).toFixed(2)})
                                                         </option>
                                                    ))}
                                               </select>
                                               <input
                                                   type="number"
                                                   id="cantidad-producto"
                                                   placeholder="Cantidad"
                                                   min="1"
                                                   value={cantidadProductoToAdd}
                                                   onChange={handleCantidadProductoChange}
                                                    disabled={isSavingVenta || !selectedProductIdToAdd}
                                               />
                                               <button
                                                   type="button"
                                                   className="btn-accion btn-agregar btn-add-producto"
                                                   onClick={handleAddProductoToSaleForm}
                                                    disabled={isSavingVenta || !selectedProductIdToAdd || cantidadProductoToAdd <= 0 || isNaN(cantidadProductoToAdd) || cantidadProductoToAdd > selectedProductStock}
                                               >
                                                    Agregar
                                               </button>
                                          </div>

                                          <table id="detalles-ventas-table">
                                               <thead>
                                                    <tr>
                                                         <th>Producto</th>
                                                         <th>Cantidad</th>
                                                         <th>Precio Unitario (S/)</th>
                                                         <th>Subtotal (S/)</th>
                                                         <th>Acciones</th>
                                                    </tr>
                                               </thead>
                                               <tbody id="detalles-ventas-tbody">
                                                    {currentDetallesForm.length === 0 ? (
                                                         <tr className="empty-table-message">
                                                              <td colSpan="5">No hay productos agregados</td>
                                                         </tr>
                                                    ) : (
                                                         currentDetallesForm.map((item, index) => (
                                                              <tr key={`${item.id_producto}-${index}`}>
                                                                   <td>{item.nombre_producto}</td>
                                                                   <td>{item.cantidad}</td>
                                                                   <td>{parseFloat(item.precio_unitario).toFixed(2)}</td>
                                                                   <td>{parseFloat(item.subtotal).toFixed(2)}</td>
                                                                   <td>
                                                                        <button
                                                                             type="button"
                                                                             className="btn-accion btn-eliminar"
                                                                             onClick={() => handleRemoveProductoFromSaleForm(startIndexDetallesForm + index)}
                                                                              disabled={isSavingVenta}
                                                                        >
                                                                             Eliminar
                                                                        </button>
                                                                   </td>
                                                              </tr>
                                                         ))
                                                    )}
                                               </tbody>
                                          </table>
                                           {renderPagination(productosEnVentaForm.length, ITEMS_PER_PAGE_DETALLES, currentPageDetallesForm, setCurrentPageDetallesForm)}


                                          <div className="total-venta">
                                               Total: <span id="total-venta">S/ {parseFloat(totalVentaCalculado).toFixed(2)}</span>
                                          </div>
                                     </div>

                                     {ventaFormError && (
                                          <div className="error-message" style={{ color: 'red', marginBottom: '15px' }}>
                                               {ventaFormError}
                                          </div>
                                      )}

                                     <div className="form-buttons">
                                          <button type="submit" className="btn-accion btn-guardar" disabled={isSavingVenta}>
                                               {isSavingVenta ? 'Guardando...' : 'Guardar Venta'}
                                          </button>
                                          <button type="button" className="btn-accion btn-cancelar" onClick={closeVentaModal} disabled={isSavingVenta}>
                                               Cancelar
                                          </button>
                                     </div>
                                 </>
                             )}
                        </form>
                    </div>
                </div>
            )}

            {isDetalleVentaModalOpen && (
                 <div id="detalle-venta-modal" className="modal" style={{ display: 'block' }}>
                      <div className="modal-content">
                           <span className="close-button" onClick={closeDetalleVentaModal}>&times;</span>
                           <h3 id="detalle-modal-title">Detalles de Venta ID: {viewingVentaId}</h3>

                           {isLoadingDetalleView && <p style={{ textAlign: 'center' }}>Cargando detalles de la venta...</p>}
                           {errorDetalleView && <p style={{ color: 'red', textAlign: 'center' }}>Error: {errorDetalleView}</p>}

                           {!isLoadingDetalleView && !errorDetalleView && detalleVentaView && (
                                <>
                                     <div className="detalles-info">
                                          <p><strong>Cliente:</strong> <span id="detalle-cliente">{detalleVentaView.cliente_nombre}</span></p>
                                          <p><strong>Vendedor:</strong> <span id="detalle-vendedor">{detalleVentaView.vendedor_nombre}</span></p>
                                          <p><strong>Fecha:</strong> <span id="detalle-fecha">{detalleVentaView.fecha ? detalleVentaView.fecha.split('T')[0] : 'N/A'}</span></p>
                                     </div>

                                     <table id="detalle-productos-table">
                                          <thead>
                                               <tr>
                                                    <th>Producto</th>
                                                    <th>Cantidad</th>
                                                    <th>Precio Unitario (S/)</th>
                                                    <th>Subtotal (S/)</th>
                                               </tr>
                                          </thead>
                                          <tbody id="detalle-productos-tbody">
                                               {currentDetallesView.length === 0 ? (
                                                    <tr className="empty-table-message">
                                                         <td colSpan="4">No hay productos en esta venta</td>
                                                    </tr>
                                               ) : (
                                                    currentDetallesView.map((item, index) => (
                                                         <tr key={`${item.id_detalle}-${index}`}>
                                                              <td>{item.nombre_producto}</td>
                                                              <td>{item.cantidad}</td>
                                                              <td>{parseFloat(item.precio_unitario).toFixed(2)}</td>
                                                              <td>{parseFloat(item.subtotal).toFixed(2)}</td>
                                                         </tr>
                                                    ))
                                               )}
                                          </tbody>
                                     </table>
                                      {renderPagination(detalleProductosView.length, ITEMS_PER_PAGE_DETALLES, currentPageDetallesView, setCurrentPageDetallesView)}


                                     <div className="total-venta">
                                          Total: <span id="detalle-total">S/ {parseFloat(detalleVentaView.total).toFixed(2)}</span>
                                     </div>
                                </>
                           )}

                           <div className="form-buttons modal-close-footer">
                                <button type="button" className="btn-accion btn-cancelar" onClick={closeDetalleVentaModal}>
                                     Cerrar
                                </button>
                           </div>
                      </div>
                 </div>
             )}

        </main>
    );
}

export default VentasPage;