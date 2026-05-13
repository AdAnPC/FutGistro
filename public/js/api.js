/**
 * API client for the frontend
 */
const API = {
    /**
     * Base fetch function
     */
    request: async (url, options = {}) => {
        try {
            const defaultOptions = {
                headers: {}
            };

            if (!(options.body instanceof FormData)) {
                defaultOptions.headers['Content-Type'] = 'application/json';
                if (options.body && typeof options.body === 'object') {
                    options.body = JSON.stringify(options.body);
                }
            }

            const response = await fetch(url, { ...defaultOptions, ...options });

            if (response.redirected) {
                window.location.href = response.url;
                return null;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error en la solicitud');
            }

            return data;
        } catch (error) {
            if (error.message === 'Failed to fetch') {
                Utils.showToast('Error de conexión con el servidor', 'error');
            }
            throw error;
        }
    },

    get: (url) => API.request(url, { method: 'GET' }),
    post: (url, body) => API.request(url, { method: 'POST', body }),
    put: (url, body) => API.request(url, { method: 'PUT', body }),
    delete: (url) => API.request(url, { method: 'DELETE' }),

    // Auth endpoints
    getCurrentUser: () => API.get('/auth/me'),
    
    // Players endpoints
    getPlayers: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return API.get(`/jugadores/api?${query}`);
    },
    getPlayer: (id) => API.get(`/jugadores/api/${id}`),
    createPlayer: (data) => API.post('/jugadores/api', data),
    updatePlayer: (id, data) => API.put(`/jugadores/api/${id}`, data),
    deletePlayer: (id) => API.delete(`/jugadores/api/${id}`),
    getStats: () => API.get('/jugadores/api/estadisticas'),

    // Categories endpoints
    getCategories: () => API.get('/categorias'),
    getCategory: (id) => API.get(`/categorias/${id}`),

    // Attendance endpoints
    getAttendanceByDate: (fecha, categoriaId) => {
        let url = `/asistencia/api/por-fecha/${fecha}`;
        if (categoriaId) url += `?categoria_id=${categoriaId}`;
        return API.get(url);
    },
    saveAttendance: (fecha, asistencias) => API.post('/asistencia/api', { fecha, asistencias }),
    getAttendanceHistory: (jugadorId) => API.get(`/asistencia/api/historial/${jugadorId}`),

    // Schools endpoints
    getSchools: () => API.get('/api/escuelas'),
    getMySchool: () => API.get('/api/escuelas/mi-escuela/api'),
    updateMySchool: (data) => API.put('/api/escuelas/mi-escuela/api', data),

    // Payments endpoints
    getPayments: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return API.get(`/pagos/api?${query}`);
    },
    updatePayment: (id, data) => API.put(`/pagos/api/${id}`, data),
    getPaymentsSummary: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return API.get(`/pagos/api/resumen?${query}`);
    }
};
