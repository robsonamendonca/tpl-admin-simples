/**
 * UI.JS — Dynamic Rendering & Interactions
 * ==================================================================== */

/* ===== RENDER: Alerts Table ===== */
function renderAlertsTable(containerId, alerts, showLocation = true, showActions = true) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = alerts.map(a => `
    <tr>
      <td><strong>${a.id}</strong></td>
      <td>${a.unit}</td>
      ${showLocation ? `<td>${a.city}, ${a.state}</td>` : ''}
      <td>${a.time}</td>
      <td>${a.duration}</td>
      <td>${Utils.statusBadgeTable(a.status)}</td>
      ${showActions ? `
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-secondary btn-sm" title="Ver detalhes">
              <i class="bi bi-eye"></i>
            </button>
            ${a.status === 'active' ? `
              <button class="btn btn-primary btn-sm" title="Atender">
                <i class="bi bi-person-check"></i>
              </button>
            ` : ''}
            ${a.status !== 'closed' ? `
              <button class="btn btn-success btn-sm" title="Encerrar">
                <i class="bi bi-check-lg"></i>
              </button>
            ` : ''}
          </div>
        </td>
      ` : ''}
    </tr>
  `).join('');
}

/* ===== RENDER: Users Table ===== */
function renderUsersTable(containerId, users) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const colors = ['#0078d4','#d13438','#107c10','#8764b8','#ff6b35','#0078d4'];
  
  container.innerHTML = users.map((u, i) => `
    <tr>
      <td>
        <div class="d-flex items-center gap-2">
          <div class="avatar" style="background:${colors[i % colors.length]}">${u.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
          <div>
            <div class="fw-medium">${u.name}</div>
            <div class="text-small text-muted">${u.email}</div>
          </div>
        </div>
      </td>
      <td>${u.role}</td>
      <td>${u.unit}</td>
      <td>${Utils.userStatusBadge(u.status)}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn btn-secondary btn-sm btn-icon" title="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-secondary btn-sm btn-icon" title="${u.status === 'active' ? 'Desativar' : 'Ativar'}">
            <i class="bi bi-${u.status === 'active' ? 'slash-circle' : 'check-circle'}"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* ===== RENDER: Units Table ===== */
function renderUnitsTable(containerId, units) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = units.map(u => `
    <tr>
      <td><strong>${u.name}</strong></td>
      <td>${u.city}</td>
      <td>${u.state}</td>
      <td>${Utils.unitStatusBadge(u.status)}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn btn-secondary btn-sm btn-icon" title="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-secondary btn-sm btn-icon" title="${u.status === 'operational' ? 'Desativar' : 'Ativar'}">
            <i class="bi bi-${u.status === 'operational' ? 'slash-circle' : 'check-circle'}"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* ===== RENDER: Template Cards ===== */
function renderTemplateCards(containerId, cards) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = cards.map(c => `
    <div class="template-card" onclick="location.href='${c.href}'" tabindex="0" role="button" aria-label="${c.label}">
      <div class="card-preview" style="background:${c.bg};">
        <i class="${c.icon}" style="color:${c.iconColor};"></i>
      </div>
      <div class="card-info">
        <h3>${c.label}</h3>
        <p>${c.desc}</p>
      </div>
    </div>
  `).join('');
}

/* ===== PANIC BUTTON ===== */
function initPanicButton() {
  const btn = document.getElementById('panic-btn');
  const timer = document.getElementById('panic-timer');
  const timerLabel = document.getElementById('panic-timer-label');
  const status = document.getElementById('alert-status');
  
  if (!btn) return;
  
  let state = 'normal';
  let timeout = null;
  
  btn.addEventListener('click', () => {
    if (state === 'normal') {
      state = 'counting';
      btn.disabled = true;
      timer.classList.add('active');
      timerLabel.classList.add('active');
      timerLabel.textContent = 'Clique novamente para cancelar • 20s';
      
      if (status) {
        status.className = 'alert-status active';
        status.innerHTML = '<span class="dot"></span> Aguardando confirmação...';
      }
      
      timeout = setTimeout(() => {
        state = 'active';
        timer.classList.remove('active');
        timerLabel.classList.remove('active');
        btn.disabled = true;
        
        if (status) {
          status.className = 'alert-status active';
          status.innerHTML = '<span class="dot"></span> Alerta Enviado';
        }
        
        showToast('Alerta enviado com sucesso!', 'success');
        
        // Simulate attending
        setTimeout(() => {
          if (state === 'active') {
            state = 'attending';
            if (status) {
              status.className = 'alert-status attending';
              status.innerHTML = '<span class="dot"></span> Em Atendimento';
            }
          }
        }, 8000);
        
        // Simulate closed
        setTimeout(() => {
          if (state === 'attending') {
            state = 'closed';
            btn.disabled = false;
            if (status) {
              status.className = 'alert-status closed';
              status.innerHTML = '<span class="dot"></span> Encerrado';
            }
            showToast('Ocorrência encerrada.', 'success');
            
            setTimeout(() => {
              state = 'normal';
              if (status) {
                status.className = 'alert-status normal';
                status.innerHTML = '<span class="dot"></span> Sistema Normal';
              }
            }, 4000);
          }
        }, 20000);
      }, 20000);
      
    } else if (state === 'counting') {
      clearTimeout(timeout);
      state = 'normal';
      btn.disabled = false;
      timer.classList.remove('active');
      timerLabel.classList.remove('active');
      
      if (status) {
        status.className = 'alert-status normal';
        status.innerHTML = '<span class="dot"></span> Cancelado';
        setTimeout(() => {
          if (state === 'normal') {
            status.innerHTML = '<span class="dot"></span> Sistema Normal';
          }
        }, 2000);
      }
      
      showToast('Alerta cancelado.', 'info');
    }
  });
  
  // Keyboard support
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      btn.click();
    }
  });
}

/* ===== TOAST NOTIFICATIONS ===== */
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const icons = {
    success: 'bi-check-circle-fill',
    danger: 'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-circle-fill',
    info: 'bi-info-circle-fill'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="bi ${icons[type] || icons.info} text-${type}"></i>
    <span style="flex:1;font-size:var(--fs-sm);">${message}</span>
    <button class="btn-ghost btn-sm btn-icon" onclick="this.parentElement.remove()" style="color:var(--text-secondary);">
      <i class="bi bi-x"></i>
    </button>
  `;
  
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ===== MODAL ===== */
function openModal(id) {
  const modal = document.getElementById(id);
  const backdrop = document.getElementById(id + '-backdrop');
  if (modal) modal.classList.add('show');
  if (backdrop) backdrop.classList.add('show');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  const backdrop = document.getElementById(id + '-backdrop');
  if (modal) modal.classList.remove('show');
  if (backdrop) backdrop.classList.remove('show');
}

/* ===== CLOCK ===== */
function initClock() {
  const el = document.getElementById('header-clock');
  if (!el) return;
  
  const update = () => {
    el.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  update();
  setInterval(update, 1000);
}

/* ===== INIT ALL ===== */
document.addEventListener('DOMContentLoaded', () => {
  initPanicButton();
  initClock();
});