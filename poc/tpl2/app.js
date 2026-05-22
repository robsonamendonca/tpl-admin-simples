/* ======================== STATE ======================== */
const state = {
  currentView: 'occurrences',
  currentTab: 'feed',
  isDark: false,
  panicActive: false,
  panelOpen: false,
  loggedIn: false
};

/* ======================== CONFIG ======================== */
const config = {
  views: {
    dashboard: { panelTitle: 'Dashboard', topTitle: 'Dashboard', topSub: 'Visão geral do sistema', defaultTab: 'feed' },
    alerts: { panelTitle: 'Alertas', topTitle: 'Alertas', topSub: 'Botão de pânico e monitoramento', defaultTab: 'feed' },
    occurrences: { panelTitle: 'Ocorrências', topTitle: 'Ocorrências', topSub: 'Painel do Monitor – Central Nacional', defaultTab: 'feed' },
    users: { panelTitle: 'Usuários', topTitle: 'Usuários', topSub: 'Gestão de acesso e perfis', defaultTab: 'feed' },
    units: { panelTitle: 'Unidades', topTitle: 'Unidades', topSub: 'Gestão operacional regional', defaultTab: 'feed' },
    profile: { panelTitle: 'Perfil', topTitle: 'Perfil', topSub: 'Informações do usuário logado', defaultTab: 'feed' }
  },
  panelData: {
    dashboard: {
      sections: [
        { title: 'Visão Geral', items: [
          { label: 'Alertas Ativos', dot: true, count: '3', active: true },
          { label: 'Acionamentos', dot: true, count: '12' },
          { label: 'Status Operacional', dot: true },
          { label: 'Unidades Ativas', dot: true, count: '8' }
        ]}
      ]
    },
    alerts: {
      sections: [
        { title: 'Botão de Pânico', items: [
          { label: 'Status Normal', active: true },
          { label: 'Alerta Enviado' },
          { label: 'Em Atendimento' },
          { label: 'Encerrado' }
        ]},
        { title: 'Alertas Ativos', collapsed: true, items: [
          { label: 'Unidade São Paulo', count: '12min' },
          { label: 'Unidade Rio', count: '1h 39min' },
          { label: 'Unidade Fortaleza', count: '3min' }
        ]},
        { title: 'Histórico', collapsed: true, items: [
          { label: '22/05 – BH', count: 'Encerrado' },
          { label: '21/05 – Curitiba', count: 'Encerrado' },
          { label: '20/05 – Brasília', count: 'Falso' }
        ]}
      ]
    },
    occurrences: {
      sections: [
        { title: 'Painel do Monitor', items: [
          { label: 'Confirmar Recebimento', active: true },
          { label: 'Atualizar Status' },
          { label: 'Encerrar Ocorrência' }
        ]},
        { title: 'Central Nacional', items: [
          { label: 'Todas as Unidades', count: '8' },
          { label: 'Alertas Críticos', count: '2' },
          { label: 'Tempo de Ocorrência' }
        ]},
        { title: 'Status', items: [
          { label: 'Recebido' },
          { label: 'Em Atendimento', active: true },
          { label: 'Encerrado' }
        ]}
      ]
    },
    users: {
      sections: [
        { title: 'Usuários', items: [
          { label: 'Carlos Monitor', active: true },
          { label: 'Ana Recepcionista' },
          { label: 'João Monitor' },
          { label: 'Maria Central', count: 'Inativo' }
        ]},
        { title: 'Perfis de Acesso', collapsed: true, items: [
          { label: 'Recepcionista' },
          { label: 'Monitor Unidade' },
          { label: 'Central Nacional' }
        ]}
      ]
    },
    units: {
      sections: [
        { title: 'Unidades', items: [
          { label: 'Matriz São Paulo', active: true },
          { label: 'Unidade Rio' },
          { label: 'Unidade BH' },
          { label: 'Unidade Fortaleza' }
        ]},
        { title: 'Hierarquia', collapsed: true, items: [
          { label: 'Região Sudeste', count: '3' },
          { label: 'Região Nordeste', count: '3' }
        ]}
      ]
    },
    profile: {
      sections: [
        { title: 'Usuário Logado', items: [
          { label: 'Carlos Monitor', active: true },
          { label: 'Matriz São Paulo' },
          { label: 'Central Nacional' }
        ]},
        { title: 'Status', items: [
          { label: 'Operacional', active: true },
          { label: 'Sair do Sistema' }
        ]}
      ]
    }
  }
};

/* ======================== INIT ======================== */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginEmail').focus();
  setupLogin();
  setupRailToggle();
  setupModals();
  renderPanel('occurrences');
});

/* ======================== LOGIN ======================== */
function setupLogin() {
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    if (email && pass) {
      state.loggedIn = true;
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('appShell').classList.add('visible');
      showToast('Bem-vindo ao sistema!', 'success');
    }
  });
}

function handleLogout() {
  state.loggedIn = false;
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('appShell').classList.remove('visible');
  showToast('Logout realizado.', 'info');
}

/* ======================== RAIL TOGGLE ======================== */
function setupRailToggle() {
  document.getElementById('railToggle').addEventListener('click', function() {
    this.classList.toggle('on');
  });
}

/* ======================== NAVIGATION ======================== */
function navigate(view) {
  // Update rail active
  document.querySelectorAll('.rail-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');

  // Show target view
  const target = document.getElementById('view-' + view);
  if (target) {
    target.style.display = 'block';
  }

  // Update config
  const cfg = config.views[view];
  if (cfg) {
    document.getElementById('panelTitle').textContent = cfg.panelTitle;
    document.getElementById('topbarTitle').textContent = cfg.topTitle;
    document.getElementById('topbarSubtitle').textContent = cfg.topSub;

    // Reset tabs
    switchTab(cfg.defaultTab);
  }

  state.currentView = view;
  renderPanel(view);
}

/* ======================== PANEL RENDERING ======================== */
function renderPanel(view) {
  const body = document.getElementById('panelBody');
  const data = config.panelData[view];
  if (!data) { body.innerHTML = '<p class="text-muted" style="padding:12px;">Nenhum dado</p>'; return; }

  let html = '';
  data.sections.forEach((section, si) => {
    const collapsed = section.collapsed ? 'collapsed' : '';
    html += `<div class="panel-section">
      <div class="panel-section-title ${collapsed}" onclick="toggleSection(this)">
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        ${section.title}
      </div>
      <div class="panel-section-items" ${section.collapsed ? 'style="display:none"' : ''}>`;

    section.items.forEach((item, ii) => {
      const active = item.active ? 'active' : '';
      html += `<div class="panel-item ${active}" onclick="setPanelActive(this)">
        <span class="panel-item-dot"></span>
        <span>${item.label}</span>
        ${item.count ? `<span class="panel-item-count">${item.count}</span>` : ''}
      </div>`;
    });

    html += '</div></div>';
  });

  body.innerHTML = html;
}

function toggleSection(el) {
  el.classList.toggle('collapsed');
  const items = el.nextElementSibling;
  items.style.display = el.classList.contains('collapsed') ? 'none' : 'block';
}

function setPanelActive(el) {
  el.closest('.panel-body').querySelectorAll('.panel-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
}

function filterPanelItems(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.panel-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(q) || !q ? 'flex' : 'none';
  });
}

/* ======================== TABS ======================== */
function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.topbar-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

  // Show/hide views based on tab
  const viewMap = {
    feed: 'view-' + state.currentView,
    table: 'view-table-generic',
    monitor: 'view-table-generic'
  };

  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  const target = document.getElementById(viewMap[tab]);
  if (target) {
    target.style.display = 'block';
    if (tab === 'table' || tab === 'monitor') {
      populateGenericTable(tab);
    }
  }
}

function populateGenericTable(tab) {
  const tbody = document.getElementById('genericTableBody');
  if (!tbody) return;

  const view = state.currentView;
  let rows = [];

  if (view === 'alerts') {
    rows = [
      ['#ALT-001', 'Alerta Pânico', 'Unidade São Paulo', '23/05 08:42', 'danger', 'Ativo'],
      ['#ALT-002', 'Emergência', 'Unidade Rio', '23/05 07:15', 'warning', 'Atendimento'],
      ['#ALT-003', 'Alerta Pânico', 'Unidade Fortaleza', '23/05 09:05', 'danger', 'Ativo']
    ];
  } else if (view === 'occurrences') {
    rows = [
      ['#OCC-089', 'Ocorrência Crítica', 'Unidade São Paulo', '23/05 08:42', 'danger', 'Recebido'],
      ['#OCC-088', 'Emergência', 'Unidade Rio', '23/05 07:15', 'warning', 'Em Atendimento'],
      ['#OCC-087', 'Alerta', 'Unidade Fortaleza', '23/05 09:05', 'danger', 'Recebido'],
      ['#OCC-086', 'Routine', 'Unidade BH', '22/05 16:30', 'success', 'Encerrado']
    ];
  } else if (view === 'users') {
    rows = [
      ['USR-001', 'Carlos Monitor', 'Matriz SP', '23/05 08:30', 'success', 'Ativo'],
      ['USR-002', 'Ana Recepcionista', 'Unidade BH', '23/05 07:45', 'success', 'Ativo'],
      ['USR-003', 'João Monitor', 'Unidade Rio', '23/05 06:12', 'success', 'Ativo'],
      ['USR-004', 'Maria Central', 'Matriz SP', '22/05 18:00', 'neutral', 'Inativo']
    ];
  } else if (view === 'units') {
    rows = [
      ['UND-001', 'Matriz São Paulo', 'São Paulo, SP', '—', 'success', 'Ativa'],
      ['UND-002', 'Unidade Rio', 'Rio de Janeiro, RJ', '—', 'success', 'Ativa'],
      ['UND-003', 'Unidade BH', 'Belo Horizonte, MG', '—', 'success', 'Ativa'],
      ['UND-004', 'Unidade Fortaleza', 'Fortaleza, CE', '—', 'success', 'Ativa']
    ];
  } else {
    rows = [
      ['—', 'Sem dados', '—', '—', 'neutral', '—']
    ];
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${r[0]}</strong></td>
      <td>${r[1]}</td>
      <td>${r[2]}</td>
      <td>${r[3]}</td>
      <td><span class="status-badge ${r[4]}">${r[5]}</span></td>
    </tr>
  `).join('');
}

/* ======================== PANEL TOGGLE (MOBILE) ======================== */
function togglePanel() {
  state.panelOpen = !state.panelOpen;
  document.getElementById('panel').classList.toggle('open', state.panelOpen);
}

/* ======================== THEME ======================== */
function toggleTheme() {
  state.isDark = !state.isDark;
  document.documentElement.setAttribute('data-theme', state.isDark ? 'dark' : '');
  const icon = document.getElementById('themeIcon');
  if (state.isDark) {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

/* ======================== PANIC ======================== */
function togglePanic() {
  state.panicActive = !state.panicActive;
  const el = document.getElementById('panicStatus');
  if (state.panicActive) {
    el.className = 'panic-status active';
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span>Status: <strong>ALERTA ENVIADO</strong></span>';
    showToast('🚨 ALERTA DE PÂNICO ENVIADO!', 'error');
  } else {
    el.className = 'panic-status normal';
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Status: <strong>NORMAL</strong></span>';
    showToast('Alerta encerrado. Sistema normal.', 'success');
  }
}

/* ======================== MODALS ======================== */
function setupModals() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
    }
  });
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

/* ======================== TOAST ======================== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#0f7b0f" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#d13438" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#0078d4" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

/* ======================== FEED INTERACTIONS ======================== */
document.addEventListener('click', (e) => {
  // Toggle replies
  if (e.target.closest('.feed-replies')) {
    const card = e.target.closest('.feed-card');
    const replies = card.querySelector('.feed-replies-area');
    if (replies) {
      const visible = replies.style.display !== 'none';
      replies.style.display = visible ? 'none' : 'block';
    }
  }

  // Reaction click
  if (e.target.closest('.reaction')) {
    const el = e.target.closest('.reaction');
    const parts = el.textContent.split(' ');
    if (parts.length === 2) {
      const count = parseInt(parts[1]) + 1;
      el.textContent = parts[0] + ' ' + count;
    }
  }
});

/* ======================== MORE MENU ======================== */
function toggleMoreMenu() {
  showToast('Funcionalidades adicionais em desenvolvimento', 'info');
}