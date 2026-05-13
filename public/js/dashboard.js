/**
 * dashboard.js — Logic for Dashboard view
 */

const DashboardPage = {
    init: async () => {
        const user = await App.loadUserInfo();
        DashboardPage.renderLayout(user);
        DashboardPage.bindEvents();
        await DashboardPage.loadDashboardData();
    },

    renderLayout: (user) => {
        const layout = document.getElementById('appLayout');
        layout.innerHTML = `
            ${App.renderSidebar(user.nombre, user.rol)}
            <main class="main-content">
                <div class="top-bar">
                    <div><button class="menu-toggle"><i class="bi bi-list"></i></button></div>
                    <div>
                        <h4>Dashboard</h4>
                        <div class="breadcrumb">Panel de Control</div>
                    </div>
                </div>
                <div class="content-area">
                    <!-- Stats Row -->
                    <div class="row g-4 mb-4 fade-in">
                        <div class="col-lg-3 col-md-6 col-6">
                            <div class="stat-card">
                                <div class="stat-card-icon green"><i class="bi bi-people-fill"></i></div>
                                <div class="stat-card-value" id="totalJugadores">--</div>
                                <div class="stat-card-label">Total Jugadores</div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-6 col-6">
                            <div class="stat-card">
                                <div class="stat-card-icon blue"><i class="bi bi-tags-fill"></i></div>
                                <div class="stat-card-value" id="totalCategorias">--</div>
                                <div class="stat-card-label">Categorías</div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-6 col-6">
                            <div class="stat-card">
                                <div class="stat-card-icon amber"><i class="bi bi-calendar-check-fill"></i></div>
                                <div class="stat-card-value" id="asistenciaHoy">--</div>
                                <div class="stat-card-label">Asistencia Hoy</div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-6 col-6">
                            <div class="stat-card">
                                <div class="stat-card-icon cyan"><i class="bi bi-building-fill"></i></div>
                                <div class="stat-card-value" id="totalSedes">--</div>
                                <div class="stat-card-label">Sedes / Escuelas</div>
                            </div>
                        </div>
                    </div>

                    <div class="row g-4 mb-4">
                        <div class="col-lg-8">
                            <div class="data-card slide-up">
                                <div class="data-card-header">
                                    <h5><i class="bi bi-bar-chart-fill me-2 text-primary"></i> Distribución por Categoría</h5>
                                </div>
                                <div class="data-card-body" id="categoriaChart"></div>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="data-card slide-up">
                                <div class="data-card-header">
                                    <h5><i class="bi bi-lightning-fill me-2 text-accent"></i> Acciones Rápidas</h5>
                                </div>
                                <div class="data-card-body d-grid gap-3">
                                    <a href="/jugadores/nuevo" class="btn-primary-custom justify-content-center py-3">
                                        <i class="bi bi-person-plus-fill"></i> Nuevo Jugador
                                    </a>
                                    <a href="/asistencia/page" class="btn-secondary-custom justify-content-center py-3">
                                        <i class="bi bi-calendar-check"></i> Tomar Asistencia
                                    </a>
                                    <a href="/categorias/page" class="btn-secondary-custom justify-content-center py-3">
                                        <i class="bi bi-tags"></i> Ver Categorías
                                    </a>
                                    <a href="/jugadores/page" class="btn-secondary-custom justify-content-center py-3">
                                        <i class="bi bi-list-ul"></i> Lista de Jugadores
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Players -->
                    <div class="data-card slide-up">
                        <div class="data-card-header d-flex justify-content-between align-items-center">
                            <h5><i class="bi bi-clock-history me-2 text-secondary"></i> Jugadores Recientes</h5>
                            <a href="/jugadores/page" class="btn-secondary-custom btn-sm">Ver todos <i class="bi bi-arrow-right"></i></a>
                        </div>
                        <div class="table-responsive">
                            <table class="table-custom">
                                <thead>
                                    <tr><th>Jugador</th><th>Documento</th><th>Edad</th><th>Categoría</th><th>Registro</th><th>Acciones</th></tr>
                                </thead>
                                <tbody id="recentPlayers">
                                    <tr><td colspan="6" class="text-center p-4 text-muted">Cargando...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        `;
    },

    bindEvents: () => {
        // App.init() handles sidebar toggle
    },

    loadDashboardData: async () => {
        try {
            const [statsRes, playersRes, attendanceRes] = await Promise.all([
                API.getStats(),
                API.getPlayers({ limit: 5 }),
                API.getAttendanceByDate(Utils.getTodayStr()).catch(() => ({ success: true, data: [] }))
            ]);

            if (statsRes?.success) {
                document.getElementById('totalJugadores').textContent = statsRes.data.totalJugadores;
                document.getElementById('totalCategorias').textContent = statsRes.data.porCategoria.length;
                document.getElementById('totalSedes').textContent = statsRes.data.totalEscuelas || 0;
                DashboardPage.renderCategoryChart(statsRes.data.porCategoria);
            }

            if (playersRes?.success) {
                DashboardPage.renderRecentPlayers(playersRes.data);
            }

            if (attendanceRes?.success) {
                document.getElementById('asistenciaHoy').textContent = attendanceRes.data.length;
            }
        } catch (e) {
            console.error('Error loading dashboard:', e);
        }
    },

    renderCategoryChart: (categorias) => {
        const container = document.getElementById('categoriaChart');
        if (!categorias?.length) {
            container.innerHTML = '<div class="empty-state"><i class="bi bi-bar-chart"></i><h5>Sin datos</h5></div>';
            return;
        }

        const maxVal = Math.max(...categorias.map(c => c.total), 1);
        const colors = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

        container.innerHTML = categorias.map((cat, i) => {
            const pct = (cat.total / maxVal) * 100;
            const color = colors[i % colors.length];
            return `
                <div class="mb-3">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="small fw-bold">${Utils.escapeHtml(cat.nombre)}</span>
                        <span class="small text-muted">${cat.total} jugadores</span>
                    </div>
                    <div class="progress-custom" style="height:8px;background:rgba(0,0,0,0.05);border-radius:4px;overflow:hidden">
                        <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width 1s ease"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderRecentPlayers: (jugadores) => {
        const tbody = document.getElementById('recentPlayers');
        if (!jugadores?.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-muted">No hay registros recientes</td></tr>';
            return;
        }

        tbody.innerHTML = jugadores.map(j => `
            <tr class="fade-in clickable-row" onclick="window.location.href='/jugadores/ficha/${j.id}'">
                <td>
                    <div class="d-flex align-items-center gap-2">
                        ${j.foto ? `<img src="${j.foto}" class="player-avatar">` : `<div class="player-avatar-placeholder">${j.nombre[0]}</div>`}
                        <span class="fw-bold">${Utils.escapeHtml(j.nombre)}</span>
                    </div>
                </td>
                <td>${Utils.escapeHtml(j.documento)}</td>
                <td><span class="badge-custom cyan">${Utils.calculateAge(j.fecha_nacimiento)} años</span></td>
                <td><span class="badge-custom green">${j.categoria?.nombre || 'N/A'}</span></td>
                <td>${Utils.formatDateShort(j.fecha_registro)}</td>
                <td>
                    <div class="d-flex gap-1">
                        <a href="/jugadores/ficha/${j.id}" class="btn-icon view"><i class="bi bi-eye"></i></a>
                        <a href="/jugadores/editar/${j.id}" class="btn-icon edit"><i class="bi bi-pencil"></i></a>
                    </div>
                </td>
            </tr>
        `).join('');
    }
};

document.addEventListener('DOMContentLoaded', DashboardPage.init);
