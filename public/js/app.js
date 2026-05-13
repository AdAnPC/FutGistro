/**
 * Main application logic and UI components
 */

// Define global namespaces if they don't exist (for standalone usage)
if (typeof Utils === 'undefined') {
    // Fallback if utils.js is not loaded
    window.Utils = {
        showToast: (m, t) => alert(`${t}: ${m}`),
        escapeHtml: (s) => s,
        showLoading: () => {},
        hideLoading: () => {},
        getTodayStr: () => new Date().toISOString().split('T')[0]
    };
}

const App = {
    /**
     * Initializes the common UI elements
     */
    init: async () => {
        const user = await App.loadUserInfo();
        App.initSidebar();
        App.registerPWA();
        return user;
    },

    /**
     * Loads current user info and stores it globally
     */
    loadUserInfo: async () => {
        if (window.__USER__) return window.__USER__;
        try {
            const data = await API.getCurrentUser();
            if (data && data.success) {
                window.__USER__ = data.data;
                // Redirect if user needs to select school
                if (data.data.necesita_escuela && !window.location.pathname.includes('/seleccionar-escuela')) {
                    window.location.href = '/auth/seleccionar-escuela';
                }
                return data.data;
            }
        } catch (e) {
            console.error('Error loading user info:', e);
        }
        return { nombre: 'Usuario', rol: 'entrenador' };
    },

    /**
     * Sidebar initialization and event handling
     */
    initSidebar: () => {
        const toggle = document.querySelector('.menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (toggle && sidebar && overlay) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            });

            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        }

        // Active link highlighting
        const currentPath = window.location.pathname;
        document.querySelectorAll('.sidebar-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href && (currentPath === href || (href !== '/dashboard' && currentPath.startsWith(href)))) {
                link.classList.add('active');
            }
        });
    },

    /**
     * Renders the standard sidebar HTML
     */
    renderSidebar: (userName, userRole) => {
        const rolLabels = { superadmin: 'Super Admin', administrador: 'Administrador', entrenador: 'Entrenador' };
        const rolLabel = rolLabels[userRole] || userRole || 'entrenador';
        const logoUrl = window.__USER__?.escuela_logo || '/icons/fut.jpeg';
        const schoolName = window.__USER__?.escuela_nombre || 'futGistro';

        return `
            <div class="sidebar-overlay" id="sidebarOverlay"></div>
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-brand">
                    <div class="sidebar-brand-icon">
                        <img src="${logoUrl}" alt="Logo">
                    </div>
                    <div class="sidebar-brand-text">
                        <h5>${Utils.escapeHtml(schoolName)}</h5>
                        <small>Sistema de Gestión</small>
                    </div>
                </div>
                <nav class="sidebar-nav">
                    <div class="sidebar-label">Principal</div>
                    <a href="/dashboard" class="sidebar-link"><i class="bi bi-grid-1x2-fill"></i> Dashboard</a>
                    <a href="/escuelas/mi-escuela/page" class="sidebar-link"><i class="bi bi-building"></i> Mi Escuela</a>
                    <a href="/jugadores/page" class="sidebar-link"><i class="bi bi-people-fill"></i> Jugadores</a>
                    <a href="/categorias/page" class="sidebar-link"><i class="bi bi-tags-fill"></i> Categorías</a>
                    <a href="/asistencia/page" class="sidebar-link"><i class="bi bi-calendar-check-fill"></i> Asistencia</a>
                    <a href="/pagos/page" class="sidebar-link"><i class="bi bi-cash-stack"></i> Pagos</a>
                    <a href="/torneos/page" class="sidebar-link"><i class="bi bi-trophy-fill"></i> Torneos</a>
                    
                    ${userRole === 'superadmin' ? `
                        <div class="sidebar-label">Super Admin</div>
                        <a href="/escuelas/page" class="sidebar-link"><i class="bi bi-building-fill"></i> Escuelas / Sedes</a>
                        <a href="/auth/usuarios/page" class="sidebar-link"><i class="bi bi-people-fill"></i> Gestionar Usuarios</a>
                        <a href="/auth/registro" class="sidebar-link"><i class="bi bi-person-plus-fill"></i> Crear Usuario</a>
                    ` : (userRole === 'administrador' ? `
                        <div class="sidebar-label">Administración</div>
                        <a href="/auth/registro" class="sidebar-link"><i class="bi bi-person-plus-fill"></i> Crear Usuario</a>
                    ` : '')}
                </nav>
                <div class="sidebar-user">
                    <div class="sidebar-user-avatar">${(userName || 'U').charAt(0).toUpperCase()}</div>
                    <div class="sidebar-user-info">
                        <div class="name">${Utils.escapeHtml(userName || 'Usuario')}</div>
                        <div class="role">${Utils.escapeHtml(rolLabel)}</div>
                        ${window.__USER__?.escuela_nombre ? `<div class="role school"><i class="bi bi-building"></i> ${Utils.escapeHtml(window.__USER__.escuela_nombre)}</div>` : ''}
                    </div>
                    <a href="/auth/logout" class="btn-icon" title="Cerrar sesión"><i class="bi bi-box-arrow-right"></i></a>
                </div>
            </aside>
        `;
    },

    /**
     * Registers the PWA service worker
     */
    registerPWA: () => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('PWA Service Worker registrado', reg.scope))
                .catch(err => console.log('Error registrando Service Worker:', err));
        }
    }
};

// Legacy support for global functions (to avoid breaking existing code during transition)
const showToast = Utils.showToast;
const fetchAPI = API.request;
const showLoading = Utils.showLoading;
const hideLoading = Utils.hideLoading;
const confirmAction = Utils.confirm;
const formatDate = Utils.formatDate;
const formatDateShort = Utils.formatDateShort;
const getTodayStr = Utils.getTodayStr;
const calcularEdad = Utils.calculateAge;
const escapeHtml = Utils.escapeHtml;
const loadUserInfo = App.loadUserInfo;
const getUserInfo = () => window.__USER__ || { nombre: 'Usuario', rol: 'entrenador' };
const initSidebar = App.initSidebar;
const renderSidebar = App.renderSidebar;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
