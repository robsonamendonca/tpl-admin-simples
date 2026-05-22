/**
 * APP.JS — Core Application Logic & Mock Data
 * Office 365 Inspired | MVP Sprint 1 — Atento Platform
 */

/* ===== MOCK DATA ===== */
const MOCK = {
  user: {
    id: 1,
    name: 'Maria Silva',
    email: 'maria.silva@atento.com.br',
    initials: 'MS',
    role: 'recepcionista',
    roleLabel: 'Recepcionista',
    unit: { id: 101, name: 'São Paulo - Centro', city: 'São Paulo', state: 'SP' }
  },
  
  alerts: [
    { id: 'ALT-001', unit: 'São Paulo - Centro', city: 'São Paulo', state: 'SP', time: '14:32', duration: '12min', status: 'active', triggeredBy: 'Maria Silva' },
    { id: 'ALT-002', unit: 'Rio de Janeiro - Barra', city: 'Rio de Janeiro', state: 'RJ', time: '13:15', duration: '1h 29min', status: 'attending', triggeredBy: 'João Santos' },
    { id: 'ALT-003', unit: 'Belo Horizonte - Savassi', city: 'Belo Horizonte', state: 'MG', time: '11:48', duration: '2h 56min', status: 'closed', triggeredBy: 'Ana Costa' },
    { id: 'ALT-004', unit: 'Curitiba - Centro', city: 'Curitiba', state: 'PR', time: '10:22', duration: '4h 22min', status: 'closed', triggeredBy: 'Pedro Lima' },
    { id: 'ALT-005', unit: 'Porto Alegre - Moinhos', city: 'Porto Alegre', state: 'RS', time: '09:05', duration: '5h 39min', status: 'closed', triggeredBy: 'Lucia Ferreira' }
  ],
  
  users: [
    { id: 1, name: 'Maria Silva', email: 'maria@atento.com.br', role: 'Recepcionista', unit: 'SP-Centro', status: 'active' },
    { id: 2, name: 'João Santos', email: 'joao@atento.com.br', role: 'Monitor', unit: 'SP-Centro', status: 'active' },
    { id: 3, name: 'Ana Costa', email: 'ana@atento.com.br', role: 'Administrador', unit: 'Todas', status: 'active' },
    { id: 4, name: 'Pedro Lima', email: 'pedro@atento.com.br', role: 'Recepcionista', unit: 'PR-Curitiba', status: 'inactive' }
  ],
  
  units: [
    { id: 101, name: 'São Paulo - Centro', city: 'São Paulo', state: 'SP', status: 'operational' },
    { id: 102, name: 'Rio de Janeiro - Barra', city: 'Rio de Janeiro', state: 'RJ', status: 'operational' },
    { id: 103, name: 'Belo Horizonte - Savassi', city: 'Belo Horizonte', state: 'MG', status: 'operational' },
    { id: 104, name: 'Curitiba - Centro', city: 'Curitiba', state: 'PR', status: 'maintenance' },
    { id: 105, name: 'Porto Alegre - Moinhos', city: 'Porto Alegre', state: 'RS', status: 'operational' }
  ],
  
  navItems: [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-house-door', href: 'dashboard.html' },
    { id: 'panic', label: 'Alerta de Pânico', icon: 'bi-exclamation-triangle', href: 'panic-button.html' },
    { id: 'alerts', label: 'Ocorrências', icon: 'bi-list-check', href: 'monitor-alerts.html' },
    { divider: true },
    { id: 'monitor', label: 'Monitor Local', icon: 'bi-display', href: 'monitor-alerts.html' },
    { id: 'national', label: 'Central Nacional', icon: 'bi-globe-americas', href: 'national-center.html' },
    { divider: true },
    { id: 'users', label: 'Usuários', icon: 'bi-people', href: 'users-manage.html' },
    { id: 'units', label: 'Unidades', icon: 'bi-building', href: 'units-manage.html' }
  ]
};

/* ===== UTILS ===== */
const Utils = {
  statusBadge(status) {
    const map = {
      active: { cls: 'badge-danger', label: 'Ativo' },
      attending: { cls: 'badge-primary', label: 'Atendendo' },
      closed: { cls: 'badge-success', label: 'Encerrado' },
      normal: { cls: 'badge-muted', label: 'Normal' }
    };
    const s = map[status] || map.normal;
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  },
  
  statusBadgeTable(status) {
    const map = {
      active: { cls: 'badge-danger', label: 'Ativo' },
      attending: { cls: 'badge-primary', label: 'Atendendo' },
      closed: { cls: 'badge-success', label: 'Encerrado' }
    };
    const s = map[status] || map.closed;
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  },
  
  unitStatusBadge(status) {
    const map = {
      operational: { cls: 'badge-success', label: 'Operacional' },
      maintenance: { cls: 'badge-warning', label: 'Manutenção' }
    };
    const s = map[status] || map.operational;
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  },
  
  userStatusBadge(status) {
    const map = {
      active: { cls: 'badge-success', label: 'Ativo' },
      inactive: { cls: 'badge-muted', label: 'Inativo' }
    };
    const s = map[status] || map.active;
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  }
};

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initNavHighlight();
  initTabs();
  initTheme();
});

/* ===== SIDEBAR ===== */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  const mobileToggle = document.getElementById('mobile-menu-btn');
  
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      const expanded = sidebar.classList.toggle('expanded');
      toggle.setAttribute('aria-expanded', expanded);
      toggle.querySelector('i')?.classList.toggle('bi-grid', !expanded);
      toggle.querySelector('i')?.classList.toggle('bi-x-lg', expanded);
    });
  }
  
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('show');
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && sidebar.classList.contains('show')) {
        if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
          sidebar.classList.remove('show');
        }
      }
    });
  }
}

/* ===== NAV HIGHLIGHT ===== */
function initNavHighlight() {
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'dashboard.html';
  
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    const itemPage = item.dataset.page + '.html';
    if (page === itemPage || (page === '' && item.dataset.page === 'dashboard')) {
      item.classList.add('active');
    }
  });
}

/* ===== TABS ===== */
function initTabs() {
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      tab.parentElement.querySelectorAll('.tab-item').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    });
  });
}

/* ===== THEME ===== */
function initTheme() {
  const saved = localStorage.getItem('app-theme') || 'default';
  document.documentElement.setAttribute('data-theme', saved);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('app-theme', theme);
}