/**
 * 管理后台公共工具
 */

const AdminUtils = {
  // API请求封装
  async apiRequest(url, options = {}) {
    const token = Auth.getToken();
    if (!token) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return null;
    }

    options.headers = options.headers || {};
    options.headers['Authorization'] = 'Bearer ' + token;

    if (options.body && typeof options.body === 'object') {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, options);

      if (res.status === 401) {
        Auth.clearToken();
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return null;
      }

      return await res.json();
    } catch (error) {
      console.error('API Request Error:', error);
      AdminUtils.showToast('网络请求失败', 'error');
      return null;
    }
  },

  // Toast通知
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // 确认对话框
  confirm(message, onConfirm) {
    if (window.confirm(message)) {
      onConfirm();
    }
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  // 格式化相对时间
  formatRelativeTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;

    return this.formatDate(dateStr);
  },

  // HTML转义
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // 分页组件渲染
  renderPagination(container, pagination, onPageChange) {
    const { page, limit, total } = pagination;
    const totalPages = Math.ceil(total / limit);

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = `
      <div class="admin-pagination">
        <button ${page <= 1 ? 'disabled' : ''} onclick="window.changePage(${page - 1})">上一页</button>
        <span>第 ${page} / ${totalPages} 页（共 ${total} 条）</span>
        <button ${page >= totalPages ? 'disabled' : ''} onclick="window.changePage(${page + 1})">下一页</button>
      </div>
    `;

    container.innerHTML = html;
    window.changePage = onPageChange;
  },

  // 表格操作按钮组
  renderActions(actions) {
    return actions.map(action => {
      const className = action.danger ? 'admin-btn-danger' : 'admin-btn-default';
      return `<button class="admin-btn ${className}" onclick="${action.onclick}">${action.label}</button>`;
    }).join(' ');
  },

  // 状态徽章
  renderBadge(text, type = 'info') {
    return `<span class="admin-badge admin-badge-${type}">${this.escapeHtml(text)}</span>`;
  },

  // 空状态
  renderEmpty(message = '暂无数据', icon = '📭') {
    return `
      <div class="admin-empty">
        <div class="admin-empty-icon">${icon}</div>
        <div>${message}</div>
      </div>
    `;
  },

  // 加载状态
  renderLoading() {
    return `
      <div class="admin-loading">
        <div class="admin-spinner"></div>
      </div>
    `;
  },

  // 检查管理员权限
  async checkAdminAuth() {
    const user = await Auth.getUser();

    if (!user) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return null;
    }

    if (user.role !== 'admin') {
      AdminUtils.showToast('需要管理员权限', 'error');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      return null;
    }

    return user;
  },

  // 渲染侧边栏导航
  renderSidebar(currentPage) {
    const navItems = [
      { href: '/admin-dashboard.html', icon: '📊', label: '仪表盘', page: 'dashboard' },
      { href: '/admin-settings.html', icon: '⚙️', label: '网站配置', page: 'settings' },
      { href: '/admin-cms.html', icon: '📝', label: '内容管理', page: 'cms' },
      { href: '/admin-concerts.html', icon: '🎫', label: '演唱会管理', page: 'concerts' },
      { href: '/admin-users.html', icon: '👥', label: '用户管理', page: 'users' },
      { href: '/admin-orders.html', icon: '📦', label: '订单管理', page: 'orders' },
      { href: '/admin-messages.html', icon: '💬', label: '留言管理', page: 'messages' },
      { href: '/admin-notifications.html', icon: '🔔', label: '通知管理', page: 'notifications' },
      { href: '/admin-logs.html', icon: '📋', label: '操作日志', page: 'logs' },
    ];

    return `
      <div class="admin-sidebar">
        <div class="admin-sidebar-header">
          <h1>🎵 管理后台</h1>
        </div>
        <nav class="admin-sidebar-nav">
          ${navItems.map(item => `
            <a href="${item.href}" class="admin-nav-item ${currentPage === item.page ? 'active' : ''}">
              <i>${item.icon}</i>
              ${item.label}
            </a>
          `).join('')}
          <a href="/" class="admin-nav-item" style="margin-top: 20px;">
            <i>🏠</i>
            返回前台
          </a>
        </nav>
      </div>
    `;
  },

  // 渲染顶部栏
  renderHeader(title, user) {
    return `
      <div class="admin-header">
        <div class="admin-header-left">
          <h2>${title}</h2>
        </div>
        <div class="admin-header-right">
          <div class="admin-user-info" onclick="Auth.logout()">
            <div class="admin-avatar">${user.nickname ? user.nickname[0] : user.username[0]}</div>
            <span>${user.nickname || user.username}</span>
          </div>
        </div>
      </div>
    `;
  },

  // 初始化页面布局
  async initAdminPage(pageTitle, currentPage) {
    const user = await this.checkAdminAuth();
    if (!user) return null;

    document.title = `${pageTitle} - 管理后台`;

    const layoutHTML = `
      <div class="admin-layout">
        ${this.renderSidebar(currentPage)}
        <div class="admin-main">
          ${this.renderHeader(pageTitle, user)}
          <div class="admin-content" id="adminContent">
            ${this.renderLoading()}
          </div>
        </div>
      </div>
    `;

    document.body.innerHTML = layoutHTML;

    return user;
  }
};

// 全局导出
window.AdminUtils = AdminUtils;
