/**
 * THEMES.JS — Theme Switcher
 * ==================================================================== */

const THEMES = [
  { id: 'default', name: 'Azul Office', icon: 'bi-palette', color: '#0078d4' },
  { id: 'orange', name: 'Laranja Atento', icon: 'bi-palette', color: '#ff6b35' },
  { id: 'green', name: 'Verde Enterprise', icon: 'bi-palette', color: '#107c10' },
  { id: 'purple', name: 'Roxo Moderno', icon: 'bi-palette', color: '#8764b8' },
  { id: 'dark', name: 'Escuro', icon: 'bi-moon-stars', color: '#1a1a2e' }
];

function renderThemePicker() {
  const container = document.getElementById('theme-picker');
  if (!container) return;
  
  const current = document.documentElement.getAttribute('data-theme') || 'default';
  
  container.innerHTML = THEMES.map(t => `
    <button class="theme-option ${t.id === current ? 'active' : ''}" 
            data-theme="${t.id}" 
            title="${t.name}"
            style="background:${t.color};">
      <i class="bi ${t.icon}"></i>
    </button>
  `).join('');
  
  container.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('app-theme', theme);
      
      container.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      showToast(`Tema "${THEMES.find(t=>t.id===theme)?.name}" aplicado`, 'info');
    });
  });
}

document.addEventListener('DOMContentLoaded', renderThemePicker);