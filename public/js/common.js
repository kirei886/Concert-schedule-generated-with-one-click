/**
 * 公共工具模块
 * Auth 认证 + API 封装 + 通用辅助函数
 */

const Auth = {
  getToken: () => localStorage.getItem('concert_token'),
  setToken: (token) => localStorage.setItem('concert_token', token),
  clearToken: () => localStorage.removeItem('concert_token'),

  async getUser() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 0) return data.data;
      }
      this.clearToken();
      return null;
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  async apiFetch(url, options = {}) {
    const token = this.getToken();
    if (token) {
      options.headers = options.headers || {};
      if (!options.headers['Authorization']) {
        options.headers['Authorization'] = 'Bearer ' + token;
      }
    }
    if (options.body && typeof options.body === 'object') {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, options);
    if (res.status === 401) {
      this.clearToken();
      if (!window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      }
      return null;
    }
    return res;
  },

  async apiPost(url, body) {
    const res = await this.apiFetch(url, { method: 'POST', body });
    if (!res) return null;
    return res.json();
  },

  async apiGet(url) {
    const res = await this.apiFetch(url, { method: 'GET' });
    if (!res) return null;
    return res.json();
  },

  async apiPut(url, body) {
    const res = await this.apiFetch(url, { method: 'PUT', body });
    if (!res) return null;
    return res.json();
  },

  async apiDelete(url) {
    const res = await this.apiFetch(url, { method: 'DELETE' });
    if (!res) return null;
    return res.json();
  },

  logout() {
    this.clearToken();
    window.location.href = '/login.html';
  }
};

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#7C3AED'};
    color: white; padding: 12px 24px; border-radius: 12px; font-size: 14px;
    z-index: 99999; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    animation: slideDown 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function renderNavbar(currentUser) {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  const links = [
    { href: '/', text: '行程生成器', icon: '🏠' },
    { href: '/my-trips.html', text: '我的行程', icon: '📋' },
    { href: '/favorites.html', text: '我的收藏', icon: '⭐' },
    { href: '/orders.html', text: '我的订单', icon: '📦' },
    { href: '/messages.html', text: '留言板', icon: '💬' },
  ];

  // PC端用户区域
  let userHtmlPC = '';
  if (currentUser) {
    const avatar = currentUser.avatar_url
      ? `<img src="${escapeHtml(currentUser.avatar_url)}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">`
      : `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#EC4899);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:600;">${escapeHtml((currentUser.nickname || currentUser.username || '?')[0])}</div>`;

    userHtmlPC = `
      <div class="nav-user" style="display:flex;align-items:center;gap:8px;cursor:pointer;position:relative;" onclick="toggleUserMenu()">
        ${avatar}
        <span style="font-size:13px;color:var(--text-main);">${escapeHtml(currentUser.nickname || currentUser.username)}</span>
        ${currentUser.role === 'admin' ? '<span style="font-size:10px;background:#FEF3C7;color:#D97706;padding:1px 6px;border-radius:8px;font-weight:600;">ADMIN</span>' : ''}
        <div id="userMenu" style="display:none;position:absolute;top:100%;right:0;margin-top:8px;background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.12);overflow:hidden;min-width:140px;z-index:100;">
          <a href="/profile.html" style="display:block;padding:10px 16px;font-size:13px;color:var(--text-main);text-decoration:none;">个人中心</a>
          <a href="/my-trips.html" style="display:block;padding:10px 16px;font-size:13px;color:var(--text-main);text-decoration:none;">我的行程</a>
          <a href="/favorites.html" style="display:block;padding:10px 16px;font-size:13px;color:var(--text-main);text-decoration:none;">我的收藏</a>
          <a href="/orders.html" style="display:block;padding:10px 16px;font-size:13px;color:var(--text-main);text-decoration:none;">我的订单</a>
          ${currentUser.role === 'admin' ? '<div style="border-top:1px solid #f0f0f0;padding:8px 16px;font-size:11px;color:#D97706;font-weight:600;">管理员</div><a href="/admin-concerts.html" style="display:block;padding:10px 16px;font-size:13px;color:#7C3AED;font-weight:500;text-decoration:none;">🎫 票务管理</a>' : ''}
          <div onclick="Auth.logout()" style="display:block;padding:10px 16px;font-size:13px;color:#ef4444;cursor:pointer;border-top:1px solid #f0f0f0;">退出登录</div>
        </div>
      </div>
    `;
  } else {
    userHtmlPC = `
      <a href="/login.html" style="font-size:13px;color:var(--primary);text-decoration:none;font-weight:500;">登录</a>
      <a href="/register.html" style="font-size:13px;color:white;background:linear-gradient(135deg,#7C3AED,#EC4899);padding:6px 16px;border-radius:20px;text-decoration:none;font-weight:500;">注册</a>
    `;
  }

  // 移动端菜单内容
  let mobileMenuItems = '';
  links.forEach(l => {
    mobileMenuItems += `<a href="${l.href}" class="mobile-menu-item" onclick="closeMobileMenu()">${l.icon} ${l.text}</a>`;
  });

  // 移动端用户区域
  let userHtmlMobile = '';
  if (currentUser) {
    const avatarMobile = currentUser.avatar_url
      ? `<img src="${escapeHtml(currentUser.avatar_url)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`
      : `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#EC4899);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;font-weight:600;">${escapeHtml((currentUser.nickname || currentUser.username || '?')[0])}</div>`;

    userHtmlMobile = `
      <div class="mobile-user-info">
        ${avatarMobile}
        <div>
          <div style="font-size:16px;font-weight:600;color:var(--text-main);">${escapeHtml(currentUser.nickname || currentUser.username)}</div>
          ${currentUser.role === 'admin' ? '<div style="font-size:11px;color:#D97706;margin-top:2px;">管理员</div>' : ''}
        </div>
      </div>
      <a href="/profile.html" class="mobile-menu-item" onclick="closeMobileMenu()">👤 个人中心</a>
      ${currentUser.role === 'admin' ? '<a href="/admin-concerts.html" class="mobile-menu-item" onclick="closeMobileMenu()" style="color:#7C3AED;">🎫 票务管理</a>' : ''}
      <div class="mobile-menu-item" onclick="Auth.logout()" style="color:#ef4444;cursor:pointer;">🚪 退出登录</div>
    `;
  } else {
    userHtmlMobile = `
      <a href="/login.html" class="mobile-menu-item" onclick="closeMobileMenu()" style="color:var(--primary);font-weight:600;">🔑 登录</a>
      <a href="/register.html" class="mobile-menu-item" onclick="closeMobileMenu()" style="background:linear-gradient(135deg,#7C3AED,#EC4899);color:white;font-weight:600;text-align:center;">✨ 注册账号</a>
    `;
  }

  nav.innerHTML = `
    <!-- PC端导航栏 -->
    <div class="navbar-desktop" style="display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:rgba(255,255,255,0.85);backdrop-filter:blur(10px);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:50;">
      <div class="nav-left" style="display:flex;align-items:center;gap:24px;">
        <a href="/" style="font-size:18px;font-weight:800;background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-decoration:none;">演唱会行程</a>
        <div class="nav-links" style="display:flex;align-items:center;gap:24px;">
          ${links.map(l => `<a href="${l.href}" style="font-size:13px;color:var(--text-sub);text-decoration:none;transition:color 0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-sub)'">${l.text}</a>`).join('')}
        </div>
      </div>
      <div class="nav-right" style="display:flex;align-items:center;gap:12px;">
        ${userHtmlPC}
      </div>
    </div>

    <!-- 移动端导航栏 -->
    <div class="navbar-mobile" style="display:none;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:50;">
      <a href="/" style="font-size:16px;font-weight:800;background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-decoration:none;">🎵 演唱会行程</a>
      <button class="hamburger-btn" onclick="toggleMobileMenu()" style="width:44px;height:44px;border:none;background:transparent;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-main);">
        <span id="hamburgerIcon">☰</span>
      </button>
    </div>

    <!-- 移动端菜单遮罩 -->
    <div class="mobile-menu-overlay" id="mobileMenuOverlay" onclick="closeMobileMenu()" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99;"></div>

    <!-- 移动端菜单 -->
    <div class="mobile-menu" id="mobileMenu" style="display:none;position:fixed;top:0;right:-100%;width:80%;max-width:320px;height:100vh;background:white;z-index:100;overflow-y:auto;transition:right 0.3s ease;box-shadow:-4px 0 20px rgba(0,0,0,0.15);">
      <div style="padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <span style="font-size:18px;font-weight:700;background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">菜单</span>
          <button onclick="closeMobileMenu()" style="width:36px;height:36px;border:none;background:#f3f4f6;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-sub);">✕</button>
        </div>
        ${mobileMenuItems}
        <div style="border-top:1px solid var(--border);margin:16px 0;"></div>
        ${userHtmlMobile}
      </div>
    </div>
  `;
}

function toggleUserMenu() {
  const menu = document.getElementById('userMenu');
  if (menu) {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const overlay = document.getElementById('mobileMenuOverlay');
  const icon = document.getElementById('hamburgerIcon');

  if (menu && overlay && icon) {
    const isOpen = menu.style.display === 'block';

    if (isOpen) {
      // 关闭菜单
      menu.style.right = '-100%';
      overlay.style.display = 'none';
      icon.textContent = '☰';
      setTimeout(() => {
        menu.style.display = 'none';
      }, 300);
    } else {
      // 打开菜单
      menu.style.display = 'block';
      overlay.style.display = 'block';
      setTimeout(() => {
        menu.style.right = '0';
      }, 10);
      icon.textContent = '✕';
    }
  }
}

function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const overlay = document.getElementById('mobileMenuOverlay');
  const icon = document.getElementById('hamburgerIcon');

  if (menu && overlay && icon) {
    menu.style.right = '-100%';
    overlay.style.display = 'none';
    icon.textContent = '☰';
    setTimeout(() => {
      menu.style.display = 'none';
    }, 300);
  }
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('userMenu');
  const userArea = document.querySelector('.nav-user');
  if (menu && userArea && !userArea.contains(e.target)) {
    menu.style.display = 'none';
  }
});

async function initPage() {
  const user = await Auth.getUser();
  renderNavbar(user);
  return user;
}

window.Auth = Auth;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.renderNavbar = renderNavbar;
window.initPage = initPage;
window.toggleUserMenu = toggleUserMenu;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
