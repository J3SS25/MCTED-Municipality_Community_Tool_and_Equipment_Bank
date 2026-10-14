// ==========================================================================
// MUNICIPAL COMMUNITY TOOL AND EQUIPMENT BANK (MCTEB)
// Client-Side Application Controller - Municipality of Basco, Batanes
// ==========================================================================

const App = {
  currentUser: null,
  isGuestMode: false,
  currentView: 'dashboard',
  lowBandwidth: localStorage.getItem('mcteb_low_bandwidth') === 'true',
  selectedCategory: 'All',
  metadata: null,
  cachedTools: [],

  // Init Application
  async init() {
    this.applyLowBandwidthState();
    this.initializeAuthControls();
    try {
      this.metadata = await API.getMetadata();
    } catch (e) {
      console.warn('Could not pre-fetch metadata:', e);
    }

    try {
      const meRes = await API.getMe();
      if (meRes.success && meRes.user) {
        this.currentUser = meRes.user;
        this.isGuestMode = false;
        this.renderMainframe();
      } else {
        this.renderAuthScreen();
      }
    } catch (e) {
      this.renderAuthScreen();
    }
  },

  // Toast Alerts
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '⚠️';
    if (type === 'warning') icon = '🔔';

    toast.innerHTML = `
      <span style="font-size: 1.1rem;">${icon}</span>
      <div class="toast-message">${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Low Bandwidth Mode Toggle
  toggleLowBandwidth() {
    this.lowBandwidth = !this.lowBandwidth;
    localStorage.setItem('mcteb_low_bandwidth', this.lowBandwidth);
    this.applyLowBandwidthState();
    this.toast(
      this.lowBandwidth 
        ? 'Low-Bandwidth Mode Enabled: Graphics minimized for fast island connection.' 
        : 'Standard Visual Mode Enabled.',
      'info'
    );
    if (this.currentView === 'catalog') {
      this.loadCatalog();
    }
  },

  applyLowBandwidthState() {
    const btn = document.getElementById('low-bw-btn');
    if (this.lowBandwidth) {
      document.body.classList.add('low-bandwidth');
      if (btn) {
        btn.classList.add('active');
        btn.innerHTML = '⚡ Low-Bandwidth (Active)';
      }
    } else {
      document.body.classList.remove('low-bandwidth');
      if (btn) {
        btn.classList.remove('active');
        btn.innerHTML = '⚡ Low-Bandwidth';
      }
    }
  },

  // Screen Rendering
  renderAuthScreen() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('mainframe-screen').style.display = 'none';
  },

  renderMainframe() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('mainframe-screen').style.display = 'flex';

    this.renderSidebarUser();
    const user = this.currentUser;
    document.getElementById('sidebar-logout-label').textContent = user ? 'Logout' : 'Log In';
    document.getElementById('sidebar-logout-btn').title = user ? 'Logout' : 'Return to login';
    document.getElementById('guest-auth-actions').style.display = user ? 'none' : 'flex';
    document.querySelectorAll('.authenticated-only').forEach(el => {
      el.style.display = user ? '' : 'none';
    });

    // Role Visibility
    const isStaffOrAdmin = user && (user.role === 'Municipal Staff' || user.role === 'Administrator');
    const isAdmin = user && user.role === 'Administrator';

    document.querySelectorAll('.staff-only').forEach(el => {
      el.style.display = isStaffOrAdmin ? '' : 'none';
    });
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });

    this.navigateTo(this.isGuestMode ? 'catalog' : (this.currentView || 'dashboard'));
    if (user) this.startNotificationPoller();
  },

  renderSidebarUser() {
    const user = this.currentUser;
    document.getElementById('sidebar-user-name').textContent = user
      ? `${user.firstName} ${user.lastName}`
      : 'Guest';
    document.getElementById('sidebar-user-role').textContent = user ? user.role : 'Public catalog access';
    const avatar = document.getElementById('sidebar-user-avatar');
    avatar.textContent = user ? user.firstName.charAt(0).toUpperCase() : 'G';
    if (user && /^data:image\/(?:jpeg|png|webp);base64,/.test(user.avatar || '')) {
      const image = document.createElement('img');
      image.src = user.avatar;
      image.alt = '';
      image.className = 'avatar-image';
      avatar.textContent = '';
      avatar.appendChild(image);
    }
  },

  // Auth Tabs & Form Handlers
  showAuth(tab = 'login') {
    this.currentUser = null;
    this.isGuestMode = false;
    document.getElementById('mainframe-screen').style.display = 'none';
    this.renderAuthScreen();
    this.switchAuthTab(tab);
  },

  enterGuestMode() {
    this.currentUser = null;
    this.isGuestMode = true;
    this.currentView = 'catalog';
    this.renderMainframe();
  },

  requireLogin() {
    this.toast('Please login or create an account to continue.', 'warning');
    this.showAuth('login');
  },

  initializeAuthControls() {
    document.querySelectorAll('.toggle-password-btn').forEach(button => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.target);
        if (!input) return;
        const reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
        button.textContent = reveal ? '🙈' : '👁';
      });
    });

    [
        ['reg-password', 'reg-password-meter', 'reg-password-strength'],
        ['forgot-newpass', 'forgot-password-meter', 'forgot-password-strength'],
        ['pass-new', 'profile-password-meter', 'profile-password-strength']
    ].forEach(([inputId, meterId, textId]) => {
      const input = document.getElementById(inputId);
      if (input) input.addEventListener('input', () => this.updatePasswordStrength(input.value, meterId, textId));
    });
  },

  updatePasswordStrength(password, meterId, textId) {
    const meter = document.getElementById(meterId);
    const text = document.getElementById(textId);
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password) && /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ];
    const score = password ? checks.filter(Boolean).length : 0;
    const labels = ['Not started', 'Weak', 'Fair', 'Good', 'Strong'];
    meter.style.width = `${score * 25}%`;
    meter.dataset.strength = labels[score].toLowerCase().replace(' ', '-');
    text.textContent = `Strength: ${labels[score]}`;
  },

  escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  },

  switchAuthTab(tab) {
    document.getElementById('tab-login-btn').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register-btn').classList.toggle('active', tab === 'register');
    document.getElementById('tab-forgot-btn').classList.toggle('active', tab === 'forgot');

    document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('form-forgot').style.display = tab === 'forgot' ? 'block' : 'none';
  },

  togglePasscodeField(role) {
    const wrap = document.getElementById('passcode-wrap');
    if (role === 'Administrator' || role === 'Municipal Staff') {
      wrap.style.display = 'block';
    } else {
      wrap.style.display = 'none';
    }
  },

  async handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    try {
      const res = await API.login({ email, password, rememberMe });
      if (res.success) {
        this.currentUser = res.user;
        this.isGuestMode = false;
        this.toast(res.message, 'success');
        this.renderMainframe();
      }
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async handleRegister(event) {
    event.preventDefault();
    const password = document.getElementById('reg-password').value;
    const emailVerificationCode = document.getElementById('reg-email-code').value.trim();
    if (!emailVerificationCode) {
      this.toast('Verify your email address before creating your account.', 'warning');
      return;
    }
    if (!this.isStrongPassword(password)) {
      this.toast('Use at least 8 characters with uppercase, lowercase, a number, and a symbol.', 'warning');
      return;
    }
    const data = {
      firstName: document.getElementById('reg-firstName').value,
      middleName: document.getElementById('reg-middleName').value,
      lastName: document.getElementById('reg-lastName').value,
      birthday: document.getElementById('reg-birthday').value,
      contactNumber: document.getElementById('reg-contact').value,
      barangay: document.getElementById('reg-barangay').value,
      houseNumber: document.getElementById('reg-houseNo').value,
      street: document.getElementById('reg-street').value,
      email: document.getElementById('reg-email').value,
      password,
      emailVerificationCode,
      role: document.getElementById('reg-role').value,
      adminPasscode: document.getElementById('reg-passcode').value
    };

    try {
      const res = await API.register(data);
      if (res.success) {
        this.currentUser = res.user;
        this.isGuestMode = false;
        this.toast(res.message, 'success');
        this.renderMainframe();
      }
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const verificationCode = document.getElementById('forgot-code').value.trim();
    const newPassword = document.getElementById('forgot-newpass').value;

    if (!verificationCode) {
      this.toast('Enter the verification code sent to your email.', 'warning');
      return;
    }
    if (!this.isStrongPassword(newPassword)) {
      this.toast('Use at least 8 characters with uppercase, lowercase, a number, and a symbol.', 'warning');
      return;
    }
    try {
      const res = await API.forgotPassword({ email, verificationCode, newPassword });
      this.toast(res.message, 'success');
      this.switchAuthTab('login');
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async sendVerificationCode() {
    const email = document.getElementById('reg-email').value.trim();
    if (!email) {
      document.getElementById('reg-email').focus();
      this.toast('Enter your email address first.', 'warning');
      return;
    }
    try {
      const result = await API.sendEmailVerification(email);
      document.getElementById('verification-code-wrap').style.display = 'block';
      this.toast(result.message, 'success');
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async sendPasswordResetCode() {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) {
      document.getElementById('forgot-email').focus();
      this.toast('Enter your registered email address first.', 'warning');
      return;
    }
    try {
      const result = await API.forgotPassword({ email });
      document.getElementById('forgot-code-wrap').style.display = 'block';
      document.getElementById('forgot-pass-wrap').style.display = 'block';
      document.getElementById('forgot-submit-btn').style.display = 'block';
      this.toast(result.message, 'success');
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async sendEmailChangeCode() {
    const email = document.getElementById('profile-new-email').value.trim();
    if (!email) {
      this.toast('Enter the new email address first.', 'warning');
      return;
    }
    try {
      const result = await API.sendEmailChangeVerification(email);
      document.getElementById('profile-email-code-wrap').style.display = 'block';
      document.getElementById('profile-email-save-btn').style.display = 'inline-flex';
      this.toast(result.message, 'success');
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async handleEmailChange(event) {
    event.preventDefault();
    const email = document.getElementById('profile-new-email').value.trim();
    const emailVerificationCode = document.getElementById('profile-email-code').value.trim();
    if (!emailVerificationCode) {
      this.toast('Verify the new email address before saving it.', 'warning');
      return;
    }
    if (!window.confirm('Save this verified email address to your account?')) return;
    try {
      const result = await API.updateProfile({ email, emailVerificationCode });
      this.currentUser = result.user;
      document.getElementById('profile-new-email').value = '';
      document.getElementById('profile-email-code').value = '';
      document.getElementById('profile-email-code-wrap').style.display = 'none';
      document.getElementById('profile-email-save-btn').style.display = 'none';
      this.toast(result.message, 'success');
      this.loadProfile();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async uploadProfilePicture(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 350000) {
      event.target.value = '';
      this.toast('Choose a JPG, PNG, or WebP photo no larger than 350 KB.', 'warning');
      return;
    }

    try {
      const avatar = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read the selected photo.'));
        reader.readAsDataURL(file);
      });
      const result = await API.updateProfile({ avatar });
      this.currentUser = result.user;
      this.toast('Profile picture updated.', 'success');
      this.renderSidebarUser();
      this.loadProfile();
    } catch (err) {
      this.toast(err.message, 'danger');
    } finally {
      event.target.value = '';
    }
  },

  async removeProfilePicture() {
    if (!window.confirm('Remove your profile picture?')) return;
    try {
      const result = await API.updateProfile({ avatar: '' });
      this.currentUser = result.user;
      this.toast('Profile picture removed.', 'success');
      this.renderSidebarUser();
      this.loadProfile();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  isStrongPassword(password) {
    return password.length >= 8
      && /[a-z]/.test(password)
      && /[A-Z]/.test(password)
      && /\d/.test(password)
      && /[^A-Za-z0-9]/.test(password);
  },

  async handleLogout() {
    if (!this.currentUser) {
      this.showAuth('login');
      return;
    }
    if (!window.confirm('Are you sure you want to log out?')) return;

    try {
      await API.logout();
      this.currentUser = null;
      this.isGuestMode = false;
      this.toast('You have successfully logged out.', 'info');
      this.renderAuthScreen();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  // Navigation
  navigateTo(viewName) {
    if (this.isGuestMode && viewName !== 'catalog') {
      this.requireLogin();
      return;
    }
    this.currentView = viewName;
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      link.classList.remove('active');
    });

    const activeLink = Array.from(document.querySelectorAll('.sidebar-nav .nav-link'))
      .find(link => link.getAttribute('onclick')?.includes(`'${viewName}'`));
    if (activeLink) activeLink.classList.add('active');

    // Hide all views
    document.querySelectorAll('.app-view').forEach(v => v.style.display = 'none');

    // Show current view
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.style.display = 'block';

    // Update Topbar Title
    const titles = {
      dashboard: { title: 'Mainframe Dashboard', sub: 'Municipality of Basco &bull; Province of Batanes' },
      catalog: { title: 'Community Tool Catalog', sub: 'Browse, Search & Reserve Available Equipment' },
      reservations: { title: 'Reservation Management', sub: 'Track, Approve, and Review Booking Requests' },
      rentals: { title: 'Active Rentals & Returns', sub: 'Equipment Checkout, Return Validation & Inspection' },
      payments: { title: 'Payment Portal & Receipts', sub: 'GCash, Maya, Bank Transfer, Cash & Official Receipts' },
      inventory: { title: 'Municipal Inventory Manager', sub: 'Add, Edit, and Manage Community Equipment Records' },
      maintenance: { title: 'Maintenance & Damage Tracker', sub: 'Report Malfunctions & Track Municipal Motorpool Repairs' },
      users: { title: 'User & Staff Directory', sub: 'Manage Resident Accounts & Permissions' },
      'profile-requests': { title: 'Information Update Requests', sub: 'Review requests to correct official resident information' },
      feedback: { title: 'Community Feedback & Reviews', sub: 'Equipment Ratings and Borrower Experience' },
      profile: { title: 'Resident Profile & Security', sub: 'Update Basco Address, Contact Information & Password' }
    };

    if (titles[viewName]) {
      document.getElementById('page-heading').textContent = titles[viewName].title;
      document.getElementById('page-subheading').innerHTML = titles[viewName].sub;
    }

    // Load view data
    switch (viewName) {
      case 'dashboard': this.loadDashboard(); break;
      case 'catalog': this.loadCatalog(); break;
      case 'reservations': this.loadReservations(); break;
      case 'rentals': this.loadRentals(); break;
      case 'payments': this.loadPayments(); break;
      case 'inventory': this.loadInventory(); break;
      case 'maintenance': this.loadMaintenance(); break;
      case 'users': this.loadUsers(); break;
      case 'profile-requests': this.loadProfileChangeRequests(); break;
      case 'feedback': this.loadFeedback(); break;
      case 'profile': this.loadProfile(); break;
    }

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
  },

  toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('show');
  },

  // ==========================================
  // 1. DASHBOARD
  // ==========================================
  async loadDashboard() {
    try {
      const res = await API.getDashboardStats();
      if (!res.success) return;
      const s = res.stats;

      const statsGrid = document.getElementById('dashboard-stats-grid');
      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon">🛠️</div>
          <div class="stat-info">
            <h3>${s.toolsCount}</h3>
            <p>Total Equipment Bank</p>
          </div>
        </div>
        <div class="stat-card stat-accent">
          <div class="stat-icon">🔄</div>
          <div class="stat-info">
            <h3>${s.activeRentals}</h3>
            <p>Active Borrowings</p>
          </div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-icon">📅</div>
          <div class="stat-info">
            <h3>${s.pendingReservations}</h3>
            <p>Pending Reservations</p>
          </div>
        </div>
        <div class="stat-card stat-secondary">
          <div class="stat-icon">₱</div>
          <div class="stat-info">
            <h3>₱${s.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            <p>Total Rental Revenue</p>
          </div>
        </div>
      `;

      // Category breakdown
      const catList = document.getElementById('category-distribution-list');
      catList.innerHTML = Object.entries(s.categoryDistribution).map(([cat, count]) => `
        <div style="background: #f8fafc; border: 1px solid var(--border-color); padding: 0.75rem; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.8rem; font-weight: 600;">${cat}</span>
          <span class="badge badge-available">${count} Units</span>
        </div>
      `).join('');

      // Recent Activity
      const recentAct = document.getElementById('dashboard-recent-activity');
      if (s.recentLogs && s.recentLogs.length > 0) {
        recentAct.innerHTML = s.recentLogs.map(log => `
          <div style="padding: 0.6rem 0; border-bottom: 1px solid var(--border-color);">
            <div style="font-weight: 700; color: var(--primary-dark);">${log.action}</div>
            <div style="color: var(--text-main);">${log.details}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${new Date(log.createdAt).toLocaleString()} &bull; ${log.userName}</div>
          </div>
        `).join('');
      } else {
        recentAct.innerHTML = `<p style="color: var(--text-muted);">No recent activity logged.</p>`;
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    }
  },

  // ==========================================
  // 2. TOOL CATALOG
  // ==========================================
  selectCategory(cat) {
    this.selectedCategory = cat;
    document.querySelectorAll('#catalog-category-pills .category-pill').forEach(pill => {
      pill.classList.toggle('active', pill.textContent.includes(cat) || (cat === 'All' && pill.textContent.includes('All')));
    });
    this.filterCatalog();
  },

  async loadCatalog() {
    try {
      const res = await API.getTools();
      if (res.success) {
        this.cachedTools = res.tools;
        this.filterCatalog();
      }
    } catch (err) {
      console.error('Error loading catalog:', err);
    }
  },

  filterCatalog() {
    const q = (document.getElementById('catalog-search')?.value || '').toLowerCase().trim();
    const status = document.getElementById('catalog-filter-status')?.value || 'All';
    const condition = document.getElementById('catalog-filter-condition')?.value || 'All';

    let filtered = this.cachedTools;

    if (this.selectedCategory !== 'All') {
      filtered = filtered.filter(t => t.category === this.selectedCategory);
    }
    if (status !== 'All') {
      filtered = filtered.filter(t => t.availabilityStatus === status);
    }
    if (condition !== 'All') {
      filtered = filtered.filter(t => t.equipmentCondition === condition);
    }
    if (q) {
      filtered = filtered.filter(t => 
        t.toolName.toLowerCase().includes(q) ||
        t.toolId.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.specifications.toLowerCase().includes(q)
      );
    }

    const grid = document.getElementById('catalog-tools-grid');
    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No equipment found matching your search filters.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(t => {
      const statusBadgeClass = `badge-${t.availabilityStatus.toLowerCase().replace(' ', '-')}`;
      const conditionBadgeClass = `badge-${t.equipmentCondition.toLowerCase().replace(' ', '-')}`;
      
      const isLowBw = this.lowBandwidth;

      return `
        <div class="tool-card">
          ${!isLowBw ? `
            <div class="tool-card-image img-container">
              <img src="${t.imagePath || '/images/tools/power-tiller.svg'}" alt="${t.toolName}" loading="lazy">
              <div class="tool-status-overlay">
                <span class="badge ${statusBadgeClass}">${t.availabilityStatus}</span>
              </div>
            </div>
          ` : `
            <div style="padding: 0.5rem 1rem; background: #f1f5f9; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);">
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary);">${t.toolId}</span>
              <span class="badge ${statusBadgeClass}">${t.availabilityStatus}</span>
            </div>
          `}
          <div class="tool-card-body">
            <div class="tool-category-label">${t.category}</div>
            <h4 class="tool-card-title">${t.toolName}</h4>
            <div class="tool-card-specs">${t.description}</div>
            <div class="tool-card-inventory-meta">
              <span>Code: <strong>${t.toolId}</strong></span>
              <span>Available: <strong>${t.quantityAvailable}</strong> / ${t.quantityTotal}</span>
            </div>
            
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">
              <span>⭐ ${t.avgRating || '5.0'} (${t.reviewCount || 0} reviews)</span> &bull; 
              <span>Condition: <strong class="badge ${conditionBadgeClass}" style="font-size: 0.65rem;">${t.equipmentCondition}</strong></span>
            </div>

            <div class="tool-meta-row">
              <div class="tool-fee">₱${parseFloat(t.rentalFee).toFixed(2)} <span>/ day</span></div>
              <div class="tool-card-actions">
                <button onclick="App.viewToolDetails('${t.toolId}')" class="btn btn-outline btn-sm">View Details</button>
                <button onclick="App.reserveTool('${t.toolId}')" class="btn btn-primary btn-sm" ${t.availabilityStatus !== 'Available' || Number(t.quantityAvailable) <= 0 ? 'disabled' : ''}>Reserve Now</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async viewToolDetails(toolId) {
    try {
      const res = await API.getToolById(toolId);
      if (!res.success || !res.tool) return;
      const t = res.tool;

      document.getElementById('m-tool-title').textContent = t.toolName;
      const body = document.getElementById('m-tool-body');
      
      const statusBadge = `badge-${t.availabilityStatus.toLowerCase().replace(' ', '-')}`;
      const conditionBadge = `badge-${t.equipmentCondition.toLowerCase().replace(' ', '-')}`;

      body.innerHTML = `
        <div style="display: grid; grid-template-columns: ${this.lowBandwidth ? '1fr' : '1fr 1fr'}; gap: 1.25rem;">
          ${!this.lowBandwidth ? `
            <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; display: flex; align-items: center; justify-content: center;">
              <img src="${t.imagePath || '/images/tools/power-tiller.svg'}" alt="${t.toolName}" style="max-height: 200px; max-width: 100%;">
            </div>
          ` : ''}
          <div>
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
              <span class="badge ${statusBadge}">${t.availabilityStatus}</span>
              <span class="badge ${conditionBadge}">Condition: ${t.equipmentCondition}</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem;">${t.description}</p>
            <div style="background: #f8fafc; padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.8rem; margin-bottom: 0.75rem;">
              <strong>Technical Specifications:</strong><br>
              ${t.specifications}
            </div>
            <div class="form-grid-2" style="font-size: 0.8rem;">
              <div><strong>Tool ID:</strong> ${t.toolId}</div>
              <div><strong>Category:</strong> ${t.category}</div>
              <div><strong>Available Units:</strong> ${t.quantityAvailable} of ${t.quantityTotal}</div>
              <div><strong>Times Borrowed:</strong> ${t.totalTimesBorrowed || 0}</div>
            </div>
            <div style="margin-top: 1rem; font-size: 1.2rem; font-weight: 800; color: var(--primary);">
              ₱${parseFloat(t.rentalFee).toFixed(2)} <span style="font-size: 0.75rem; color: var(--text-muted);">Daily Rental Rate</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <h4 style="font-size: 0.9rem; margin-bottom: 0.5rem;">Community Reviews &amp; Ratings (⭐ ${t.avgRating || '5.0'})</h4>
          ${t.reviews && t.reviews.length > 0 ? t.reviews.map(r => `
            <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.8rem;">
              <div style="display: flex; justify-content: space-between;">
                <strong>${r.userName || 'Resident'}</strong>
                <span>${'⭐'.repeat(r.rating || 5)}</span>
              </div>
              <p style="color: var(--text-muted); margin-top: 0.2rem;">${r.comments || 'Great community tool.'}</p>
            </div>
          `).join('') : '<p style="font-size: 0.8rem; color: var(--text-muted);">No reviews yet for this equipment.</p>'}
        </div>
      `;

      // Save for reservation trigger
      this.selectedToolForReservation = t;
      this.openModal('modal-tool-details');
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  triggerReservationFromDetails() {
    if (!this.currentUser) {
      this.requireLogin();
      return;
    }
    this.closeModal('modal-tool-details');
    if (!this.selectedToolForReservation) return;
    this.openReservationModal(this.selectedToolForReservation);
  },

  async reserveTool(toolId) {
    if (!this.currentUser) {
      this.requireLogin();
      return;
    }
    try {
      const result = await API.getToolById(toolId);
      if (!result.success || !result.tool) throw new Error('Equipment details could not be loaded.');
      if (result.tool.availabilityStatus !== 'Available' || Number(result.tool.quantityAvailable) <= 0) {
        this.toast('This equipment is not currently available to reserve.', 'warning');
        return;
      }
      this.selectedToolForReservation = result.tool;
      this.openReservationModal(result.tool);
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  // ==========================================
  // 3. RESERVATIONS
  // ==========================================
  openReservationModal(tool) {
    document.getElementById('res-tool-id').value = tool.toolId;
    document.getElementById('res-tool-name').value = `${tool.toolId} - ${tool.toolName} (₱${tool.rentalFee}/day)`;
    
    // Set default dates (tomorrow to 3 days after)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const returnDay = new Date();
    returnDay.setDate(returnDay.getDate() + 3);

    document.getElementById('res-pickup-date').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('res-return-date').value = returnDay.toISOString().split('T')[0];
    
    this.calcReservationFee();
    this.openModal('modal-reserve');
  },

  calcReservationFee() {
    const pickup = new Date(document.getElementById('res-pickup-date').value);
    const ret = new Date(document.getElementById('res-return-date').value);
    const tool = this.selectedToolForReservation;
    if (pickup && ret && ret >= pickup && tool) {
      const diffDays = Math.max(1, Math.ceil((ret - pickup) / (1000 * 60 * 60 * 24)));
      const total = diffDays * tool.rentalFee;
      document.getElementById('res-est-fee').textContent = `₱${total.toFixed(2)} (${diffDays} day${diffDays > 1 ? 's' : ''})`;
    }
  },

  async handleCreateReservation(event) {
    event.preventDefault();
    const toolId = document.getElementById('res-tool-id').value;
    const pickupDate = document.getElementById('res-pickup-date').value;
    const returnDate = document.getElementById('res-return-date').value;
    const purpose = document.getElementById('res-purpose').value;

    try {
      const res = await API.createReservation({ toolId, pickupDate, returnDate, purpose });
      if (res.success) {
        this.toast(res.message, 'success');
        this.closeModal('modal-reserve');
        this.navigateTo('reservations');
      }
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async loadReservations() {
    try {
      const res = await API.getReservations();
      if (!res.success) return;

      const tbody = document.getElementById('reservations-tbody');
      const isStaffOrAdmin = this.currentUser.role === 'Administrator' || this.currentUser.role === 'Municipal Staff';

      if (res.reservations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">No reservation records found.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.reservations.map(r => {
        const badgeClass = `badge-${r.status.toLowerCase()}`;
        return `
          <tr>
            <td><strong>${r.reservationId}</strong></td>
            <td>
              <strong>${r.toolName}</strong><br>
              <small style="color: var(--text-muted);">${r.toolId} &bull; ₱${r.rentalFee}/day</small>
            </td>
            <td>
              ${r.borrowerName}<br>
              <small style="color: var(--text-muted);">${r.borrowerBarangay} &bull; ${r.borrowerContact}</small>
            </td>
            <td>${r.pickupDate}</td>
            <td>${r.returnDate}</td>
            <td><span class="badge ${badgeClass}">${r.status}</span></td>
            <td>
              ${r.status === 'Pending' && isStaffOrAdmin ? `
                <button onclick="App.approveReservation('${r.reservationId}')" class="btn btn-sm btn-primary">Approve</button>
                <button onclick="App.rejectReservation('${r.reservationId}')" class="btn btn-sm btn-danger">Reject</button>
              ` : ''}
              ${r.status === 'Approved' ? `
                <button onclick="App.openPaymentModalForReservation('${r.reservationId}', '${r.toolId}', '${r.rentalFee}')" class="btn btn-sm btn-secondary">Proceed to Pay</button>
                ${isStaffOrAdmin ? `
                  <button onclick="App.checkoutFromReservation('${r.reservationId}', '${r.toolId}', '${r.userId}', '${r.returnDate}')" class="btn btn-sm btn-primary">Release</button>
                ` : ''}
              ` : ''}
              ${r.status === 'Pending' && !isStaffOrAdmin ? `
                <button onclick="App.cancelReservation('${r.reservationId}')" class="btn btn-sm btn-outline">Cancel</button>
              ` : ''}
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading reservations:', err);
    }
  },

  async approveReservation(id) {
    const notes = prompt('Enter staff approval remarks / pickup instructions:', 'Approved. Present valid ID at Basco Tool Bank counter.');
    if (notes === null) return;
    try {
      const res = await API.approveReservation(id, notes);
      this.toast(res.message, 'success');
      this.loadReservations();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async rejectReservation(id) {
    const notes = prompt('Enter reason for decline:', 'Schedule conflict / reserved for emergency municipal use.');
    if (notes === null) return;
    try {
      const res = await API.rejectReservation(id, notes);
      this.toast(res.message, 'info');
      this.loadReservations();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async cancelReservation(id) {
    if (!confirm('Are you sure you want to cancel this reservation request?')) return;
    try {
      const res = await API.cancelReservation(id);
      this.toast(res.message, 'info');
      this.loadReservations();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  // ==========================================
  // 4. RENTALS & RETURNS
  // ==========================================
  async loadRentals() {
    try {
      const res = await API.getRentals();
      if (!res.success) return;

      const tbody = document.getElementById('rentals-tbody');
      const isStaffOrAdmin = this.currentUser.role === 'Administrator' || this.currentUser.role === 'Municipal Staff';

      if (res.rentals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">No active or historical rental records found.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.rentals.map(r => {
        const badgeClass = `badge-${r.rentalStatus.toLowerCase()}`;
        return `
          <tr>
            <td><strong>${r.rentalId}</strong></td>
            <td>${r.toolName} (${r.toolId})</td>
            <td>${r.borrowerName}</td>
            <td>${new Date(r.rentalDate).toLocaleDateString()}</td>
            <td>
              ${r.dueDate}
              ${r.isOverdue ? '<span class="badge badge-danger" style="margin-left: 4px;">OVERDUE</span>' : ''}
            </td>
            <td><span class="badge badge-${(r.returnedCondition || r.initialCondition || 'good').toLowerCase().replace(' ', '-')}">${r.returnedCondition || r.initialCondition}</span></td>
            <td><span class="badge ${badgeClass}">${r.rentalStatus}</span></td>
            <td>
              ${r.rentalStatus === 'Borrowed' && isStaffOrAdmin ? `
                <button onclick="App.openReturnModal('${r.rentalId}', '${r.toolName}', '${r.borrowerName}')" class="btn btn-sm btn-primary">Process Return</button>
              ` : ''}
              ${r.rentalStatus === 'Completed' ? `
                <button onclick="App.openFeedbackModal('${r.toolId}', '${r.rentalId}')" class="btn btn-sm btn-outline">⭐ Review</button>
              ` : ''}
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading rentals:', err);
    }
  },

  async openCheckoutModal() {
    const tools = await API.getTools({ status: 'Available' });
    const users = await API.getAllUsers();

    const toolSelect = document.getElementById('chk-toolId');
    toolSelect.innerHTML = tools.tools.map(t => `<option value="${t.toolId}">${t.toolId} - ${t.toolName} (Avail: ${t.quantityAvailable})</option>`).join('');

    const userSelect = document.getElementById('chk-userId');
    userSelect.innerHTML = users.users.map(u => `<option value="${u.userId}">${u.userId} - ${u.firstName} ${u.lastName} (${u.barangay})</option>`).join('');

    const next3Days = new Date();
    next3Days.setDate(next3Days.getDate() + 3);
    document.getElementById('chk-dueDate').value = next3Days.toISOString().split('T')[0];

    this.openModal('modal-checkout');
  },

  checkoutFromReservation(resId, toolId, userId, returnDate) {
    document.getElementById('chk-reservationId').value = resId;
    this.openCheckoutModal().then(() => {
      document.getElementById('chk-toolId').value = toolId;
      document.getElementById('chk-userId').value = userId;
      document.getElementById('chk-dueDate').value = returnDate;
    });
  },

  async handleCheckout(event) {
    event.preventDefault();
    const data = {
      reservationId: document.getElementById('chk-reservationId').value || null,
      toolId: document.getElementById('chk-toolId').value,
      userId: document.getElementById('chk-userId').value,
      dueDate: document.getElementById('chk-dueDate').value,
      initialCondition: document.getElementById('chk-condition').value,
      notes: document.getElementById('chk-notes').value
    };

    try {
      const res = await API.checkoutEquipment(data);
      this.toast(res.message, 'success');
      this.closeModal('modal-checkout');
      this.loadRentals();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  openReturnModal(rentalId, toolName, borrower) {
    document.getElementById('ret-rentalId').value = rentalId;
    document.getElementById('ret-info').textContent = `Equipment: ${toolName} • Borrower: ${borrower} (${rentalId})`;
    this.openModal('modal-return');
  },

  toggleReturnDamageAlert(condition) {
    if (condition === 'Needs Repair') {
      document.getElementById('ret-damage').value = '150';
      this.toast('Tool condition marked as Needs Repair. An automatic maintenance ticket will be created upon return.', 'warning');
    } else {
      document.getElementById('ret-damage').value = '0';
    }
  },

  async handleReturnEquipment(event) {
    event.preventDefault();
    const id = document.getElementById('ret-rentalId').value;
    const condition = document.getElementById('ret-condition').value;
    const data = {
      returnedCondition: condition,
      inspectionNotes: document.getElementById('ret-notes').value,
      overduePenalty: parseFloat(document.getElementById('ret-overdue').value) || 0,
      damagePenalty: parseFloat(document.getElementById('ret-damage').value) || 0,
      isDamaged: condition === 'Needs Repair'
    };

    try {
      const res = await API.returnEquipment(id, data);
      this.toast(res.message, 'success');
      this.closeModal('modal-return');
      this.loadRentals();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  // ==========================================
  // 5. PAYMENTS & OFFICIAL RECEIPTS
  // ==========================================
  async loadPayments() {
    try {
      const res = await API.getPayments();
      if (!res.success) return;

      const tbody = document.getElementById('payments-tbody');
      const isStaffOrAdmin = this.currentUser.role === 'Administrator' || this.currentUser.role === 'Municipal Staff';

      if (res.payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">No payment records found.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.payments.map(p => `
        <tr>
          <td><strong style="color: var(--primary);">${p.receiptId}</strong></td>
          <td>${p.paymentId}</td>
          <td>
            <strong>${p.toolName}</strong><br>
            <small style="color: var(--text-muted);">${p.payerName} (${p.payerBarangay})</small>
          </td>
          <td style="font-weight: 700; color: var(--primary-dark);">₱${parseFloat(p.amount).toFixed(2)}</td>
          <td>
            ${p.paymentMethod}<br>
            <small style="color: var(--text-muted);">${p.referenceNumber}</small>
          </td>
          <td>${new Date(p.paymentDate).toLocaleDateString()}</td>
          <td><span class="badge badge-${p.paymentStatus.toLowerCase()}">${p.paymentStatus}</span></td>
          <td>
            <button onclick="App.viewReceipt('${p.receiptId}')" class="btn btn-sm btn-outline">📄 View OER</button>
            ${p.paymentStatus === 'Pending' && isStaffOrAdmin ? `
              <button onclick="App.verifyPayment('${p.paymentId}')" class="btn btn-sm btn-primary">Verify</button>
            ` : ''}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Error loading payments:', err);
    }
  },

  async openPaymentModal() {
    const tools = await API.getTools();
    const toolSelect = document.getElementById('pay-toolId');
    toolSelect.innerHTML = tools.tools.map(t => `<option value="${t.toolId}" data-fee="${t.rentalFee}">${t.toolName} (₱${t.rentalFee}/day)</option>`).join('');
    
    if (tools.tools.length > 0) {
      document.getElementById('pay-amount').value = tools.tools[0].rentalFee;
    }
    
    document.getElementById('pay-ref').value = `REF-${Date.now().toString().slice(-6)}`;
    this.openModal('modal-payment');
  },

  openPaymentModalForReservation(resId, toolId, fee) {
    this.openPaymentModal().then(() => {
      document.getElementById('pay-resId').value = resId;
      document.getElementById('pay-toolId').value = toolId;
      document.getElementById('pay-amount').value = parseFloat(fee) * 2; // e.g. 2 days
    });
  },

  handlePaymentMethodChange(method) {
    if (method.includes('GCash')) {
      document.getElementById('pay-ref').placeholder = 'e.g. GCASH-9823148190';
    } else if (method.includes('Maya')) {
      document.getElementById('pay-ref').placeholder = 'e.g. MAYA-4412895123';
    } else if (method.includes('Cash')) {
      document.getElementById('pay-ref').value = `MTO-CASH-${Date.now().toString().slice(-4)}`;
    }
  },

  async handleSubmitPayment(event) {
    event.preventDefault();
    const data = {
      reservationId: document.getElementById('pay-resId').value || null,
      toolId: document.getElementById('pay-toolId').value,
      amount: document.getElementById('pay-amount').value,
      paymentMethod: document.getElementById('pay-method').value,
      referenceNumber: document.getElementById('pay-ref').value,
      notes: document.getElementById('pay-notes').value
    };

    try {
      const res = await API.submitPayment(data);
      this.toast(res.message, 'success');
      this.closeModal('modal-payment');
      this.loadPayments();
      if (res.payment?.receiptId) {
        this.viewReceipt(res.payment.receiptId);
      }
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async viewReceipt(receiptId) {
    try {
      const res = await API.getReceipt(receiptId);
      if (!res.success || !res.receipt) return;
      const r = res.receipt;

      const content = document.getElementById('receipt-modal-content');
      content.innerHTML = `
        <div class="official-receipt-box">
          <div class="receipt-header">
            <h4>Republic of the Philippines &bull; Province of Batanes</h4>
            <h2>MUNICIPALITY OF BASCO</h2>
            <p style="font-size: 0.75rem; color: #64748b;">Municipal Community Tool and Equipment Bank (MCTEB)</p>
            <p style="font-size: 0.75rem; color: #64748b;">OFFICIAL ELECTRONIC RENTAL RECEIPT</p>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 0.8rem; background: #ecfdf5; padding: 0.5rem; border-radius: 4px;">
            <div><strong>OR NO:</strong> <span style="color: #15432a; font-weight: 800;">${r.receiptId}</span></div>
            <div><strong>Date:</strong> ${new Date(r.transaction.paymentDate).toLocaleDateString()}</div>
          </div>

          <div class="receipt-grid">
            <div>
              <strong>PAYOR:</strong><br>
              <strong>${r.payer.name}</strong><br>
              <span style="color: #64748b;">ID: ${r.payer.userId}</span><br>
              <span>Brgy. ${r.payer.barangay}, Basco</span><br>
              <span>${r.payer.contactNumber}</span>
            </div>
            <div>
              <strong>TRANSACTION DETAILS:</strong><br>
              <span><strong>Method:</strong> ${r.transaction.paymentMethod}</span><br>
              <span><strong>Ref No:</strong> ${r.transaction.referenceNumber}</span><br>
              <span><strong>Status:</strong> <strong style="color: #16a34a;">${r.transaction.paymentStatus}</strong></span>
            </div>
          </div>

          <table class="table" style="margin: 1rem 0;">
            <thead>
              <tr>
                <th>Equipment Description</th>
                <th style="text-align: right;">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${r.equipment.toolName}</strong><br>
                  <small style="color: #64748b;">Tool ID: ${r.equipment.toolId} &bull; Category: ${r.equipment.category}</small>
                </td>
                <td style="text-align: right; font-weight: 700;">₱${parseFloat(r.transaction.amountPaid).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="receipt-total-row">
            <span>TOTAL AMOUNT (PHP):</span>
            <span>₱${parseFloat(r.transaction.amountPaid).toFixed(2)}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 1.5rem;">
            <div>
              <span class="receipt-stamp">PAYMENT VERIFIED</span>
            </div>
            <div style="text-align: right; font-size: 0.75rem;">
              <small style="color: #64748b;">Authorized Signature / Verified by:</small><br>
              <strong>${r.transaction.verifiedBy || 'Municipal Staff / System'}</strong><br>
              <span>Basco Municipal Treasury</span>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-print-receipt').onclick = () => {
        window.open(`/receipt-print.html?id=${r.receiptId}`, '_blank');
      };

      this.openModal('modal-receipt');
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async verifyPayment(paymentId) {
    try {
      const res = await API.verifyPayment(paymentId, { paymentStatus: 'Paid' });
      this.toast(res.message, 'success');
      this.loadPayments();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  // ==========================================
  // 6. INVENTORY MANAGEMENT (Staff / Admin)
  // ==========================================
  async loadInventory() {
    try {
      const res = await API.getTools({ includeArchived: true });
      if (!res.success) return;

      const tbody = document.getElementById('inventory-tbody');
      tbody.innerHTML = res.tools.map(t => {
        const badgeClass = `badge-${t.availabilityStatus.toLowerCase().replace(' ', '-')}`;
        const conditionBadge = `badge-${t.equipmentCondition.toLowerCase().replace(' ', '-')}`;
        return `
          <tr>
            <td><strong>${t.toolId}</strong></td>
            <td>
              <strong>${t.toolName}</strong><br>
              <small style="color: var(--text-muted);">${t.category}</small>
            </td>
            <td>₱${parseFloat(t.rentalFee).toFixed(2)}/day</td>
            <td>${t.quantityTotal} / <strong>${t.quantityAvailable}</strong></td>
            <td><span class="badge ${conditionBadge}">${t.equipmentCondition}</span></td>
            <td><span class="badge ${badgeClass}">${t.availabilityStatus}</span></td>
            <td>${t.totalTimesBorrowed || 0} times</td>
            <td>
              <button onclick="App.openEditToolModal('${t.toolId}')" class="btn btn-sm btn-outline">Edit</button>
              <button onclick="App.deleteTool('${t.toolId}')" class="btn btn-sm btn-danger">Archive</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  },

  openToolModal() {
    document.getElementById('tool-form-title').textContent = 'Add New Equipment';
    document.getElementById('tf-toolId').value = '';
    document.getElementById('tf-name').value = '';
    document.getElementById('tf-desc').value = '';
    document.getElementById('tf-specs').value = '';
    document.getElementById('tf-fee').value = '50';
    document.getElementById('tf-deposit').value = '100';
    document.getElementById('tf-qty').value = '1';
    this.openModal('modal-tool-form');
  },

  async openEditToolModal(toolId) {
    const res = await API.getToolById(toolId);
    if (!res.success || !res.tool) return;
    const t = res.tool;

    document.getElementById('tool-form-title').textContent = `Edit Equipment (${t.toolId})`;
    document.getElementById('tf-toolId').value = t.toolId;
    document.getElementById('tf-name').value = t.toolName;
    document.getElementById('tf-category').value = t.category;
    document.getElementById('tf-desc').value = t.description;
    document.getElementById('tf-specs').value = t.specifications;
    document.getElementById('tf-fee').value = t.rentalFee;
    document.getElementById('tf-deposit').value = t.depositFee;
    document.getElementById('tf-qty').value = t.quantityTotal;
    document.getElementById('tf-condition').value = t.equipmentCondition;
    document.getElementById('tf-status').value = t.availabilityStatus;

    this.openModal('modal-tool-form');
  },

  async handleSaveTool(event) {
    event.preventDefault();
    const toolId = document.getElementById('tf-toolId').value;
    const data = {
      toolName: document.getElementById('tf-name').value,
      category: document.getElementById('tf-category').value,
      description: document.getElementById('tf-desc').value,
      specifications: document.getElementById('tf-specs').value,
      rentalFee: document.getElementById('tf-fee').value,
      depositFee: document.getElementById('tf-deposit').value,
      quantityTotal: document.getElementById('tf-qty').value,
      equipmentCondition: document.getElementById('tf-condition').value,
      availabilityStatus: document.getElementById('tf-status').value
    };

    try {
      let res;
      if (toolId) {
        res = await API.updateTool(toolId, JSON.stringify(data));
      } else {
        res = await API.createTool(JSON.stringify(data));
      }
      this.toast(res.message, 'success');
      this.closeModal('modal-tool-form');
      this.loadInventory();
      this.loadCatalog();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async deleteTool(toolId) {
    if (!confirm(`Archive equipment ${toolId} from active inventory?`)) return;
    try {
      const res = await API.deleteTool(toolId);
      this.toast(res.message, 'info');
      this.loadInventory();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  // ==========================================
  // 7. MAINTENANCE & REPAIRS
  // ==========================================
  async loadMaintenance() {
    try {
      const res = await API.getMaintenance();
      if (!res.success) return;

      const tbody = document.getElementById('maintenance-tbody');
      const isStaffOrAdmin = this.currentUser.role === 'Administrator' || this.currentUser.role === 'Municipal Staff';

      if (res.tickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">No maintenance tickets found.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.tickets.map(m => {
        const badgeClass = `badge-${m.status.toLowerCase().replace(' ', '-')}`;
        const severityClass = `badge-${m.severity.toLowerCase()}`;
        return `
          <tr>
            <td><strong>${m.maintenanceId}</strong></td>
            <td>${m.toolName} (${m.toolId})</td>
            <td>${m.issueDescription}</td>
            <td><span class="badge ${severityClass}">${m.severity}</span></td>
            <td>${m.assignedTechnician || 'Basco Motorpool'}</td>
            <td>₱${parseFloat(m.actualCost || m.estimatedCost || 0).toFixed(2)}</td>
            <td><span class="badge ${badgeClass}">${m.status}</span></td>
            <td>
              ${isStaffOrAdmin ? `
                <button onclick="App.openUpdateMaintenanceModal('${m.maintenanceId}')" class="btn btn-sm btn-primary">Update Status</button>
              ` : ''}
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading maintenance:', err);
    }
  },

  async openReportDamageModal() {
    const tools = await API.getTools();
    const toolSelect = document.getElementById('rep-toolId');
    toolSelect.innerHTML = tools.tools.map(t => `<option value="${t.toolId}">${t.toolId} - ${t.toolName}</option>`).join('');
    this.openModal('modal-maintenance-report');
  },

  async handleReportDamage(event) {
    event.preventDefault();
    const data = {
      toolId: document.getElementById('rep-toolId').value,
      severity: document.getElementById('rep-severity').value,
      issueDescription: document.getElementById('rep-desc').value
    };

    try {
      const res = await API.reportDamage(data);
      this.toast(res.message, 'warning');
      this.closeModal('modal-maintenance-report');
      this.loadMaintenance();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async openUpdateMaintenanceModal(ticketId) {
    const res = await API.getMaintenanceById(ticketId);
    if (!res.success || !res.ticket) return;
    const m = res.ticket;

    document.getElementById('mnt-ticketId').value = m.maintenanceId;
    document.getElementById('mnt-status').value = m.status;
    document.getElementById('mnt-technician').value = m.assignedTechnician || 'Basco Municipal Motorpool';
    document.getElementById('mnt-est-cost').value = m.estimatedCost || 0;
    document.getElementById('mnt-act-cost').value = m.actualCost || 0;
    document.getElementById('mnt-notes').value = m.resolutionNotes || '';

    this.openModal('modal-maintenance-update');
  },

  async handleUpdateMaintenance(event) {
    event.preventDefault();
    const id = document.getElementById('mnt-ticketId').value;
    const data = {
      status: document.getElementById('mnt-status').value,
      assignedTechnician: document.getElementById('mnt-technician').value,
      estimatedCost: document.getElementById('mnt-est-cost').value,
      actualCost: document.getElementById('mnt-act-cost').value,
      resolutionNotes: document.getElementById('mnt-notes').value
    };

    try {
      const res = await API.updateMaintenance(id, data);
      this.toast(res.message, 'success');
      this.closeModal('modal-maintenance-update');
      this.loadMaintenance();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  // ==========================================
  // 8. USER DIRECTORY (Admin)
  // ==========================================
  async loadUsers() {
    try {
      const res = await API.getAllUsers();
      if (!res.success) return;

      const tbody = document.getElementById('users-tbody');
      tbody.innerHTML = res.users.map(u => `
        <tr>
          <td><strong>${u.userId}</strong></td>
          <td>${u.firstName} ${u.middleName ? u.middleName + ' ' : ''}${u.lastName}</td>
          <td>${u.barangay}</td>
          <td>${u.contactNumber}</td>
          <td>${u.email}</td>
          <td><span class="badge badge-scheduled">${u.role}</span></td>
          <td><span class="badge badge-${u.status.toLowerCase().replace(' ', '-')}">${u.status}</span></td>
          <td>
            <button onclick="App.toggleUserStatus('${u.userId}', '${u.status}')" class="btn btn-sm ${u.status === 'Active' ? 'btn-danger' : 'btn-primary'}">
              ${u.status === 'Active' ? 'Suspend' : 'Activate'}
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Error loading users:', err);
    }
  },

  async toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    if (!confirm(`Change user ${userId} status to ${newStatus}?`)) return;
    try {
      const res = await API.updateUserStatus(userId, { status: newStatus });
      this.toast(res.message, 'info');
      this.loadUsers();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async loadProfileChangeRequests() {
    const tbody = document.getElementById('profile-change-requests-tbody');
    if (!tbody) return;
    try {
      const res = await API.getProfileChangeRequests();
      if (!res.success) throw new Error('Could not load profile update requests.');
      if (!res.requests.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No information update requests.</td></tr>';
        return;
      }
      const labels = {
        firstName: 'First Name',
        middleName: 'Middle Name',
        lastName: 'Last Name',
        birthday: 'Birthday',
        barangay: 'Barangay',
        houseNumber: 'House Number',
        street: 'Street Address'
      };
      tbody.innerHTML = res.requests.map(request => `
        <tr>
          <td>${this.escapeHTML(request.userName)} (${this.escapeHTML(request.userId)})</td>
          <td>${labels[request.field] || this.escapeHTML(request.field)}</td>
          <td>${this.escapeHTML(request.requestedValue)}</td>
          <td>${this.escapeHTML(request.reason)}${request.notes ? `<br><small>${this.escapeHTML(request.notes)}</small>` : ''}</td>
          <td>${new Date(request.createdAt).toLocaleString()}</td>
          <td><span class="badge badge-${request.status.toLowerCase()}">${this.escapeHTML(request.status)}</span></td>
          <td>${request.status === 'Pending' && request.userId !== this.currentUser.userId ? `
            <button onclick="App.reviewProfileChangeRequest('${this.escapeHTML(request.requestId)}', 'Approved')" class="btn btn-sm btn-primary">Approve</button>
            <button onclick="App.reviewProfileChangeRequest('${this.escapeHTML(request.requestId)}', 'Rejected')" class="btn btn-sm btn-danger">Reject</button>
          ` : '—'}</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger);">Could not load update requests.</td></tr>';
      this.toast(err.message, 'danger');
    }
  },

  async reviewProfileChangeRequest(requestId, status) {
    const reviewNotes = window.prompt(`Optional review notes for ${status.toLowerCase()}:`, '');
    if (reviewNotes === null) return;
    try {
      const result = await API.reviewProfileChangeRequest(requestId, { status, reviewNotes });
      this.toast(result.message, 'success');
      this.loadProfileChangeRequests();
      this.loadUsers();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  // ==========================================
  // 9. COMMUNITY FEEDBACK
  // ==========================================
  async loadFeedback() {
    try {
      const res = await API.getFeedback();
      if (!res.success) return;

      const grid = document.getElementById('feedback-grid');
      if (res.feedback.length === 0) {
        grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">No community feedback yet.</p>`;
        return;
      }

      grid.innerHTML = res.feedback.map(f => `
        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.2rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <div>
              <strong>${f.userName}</strong><br>
              <small style="color: var(--text-muted);">${f.userBarangay ? 'Brgy. ' + f.userBarangay : 'Basco'}</small>
            </div>
            <div>${'⭐'.repeat(f.rating)}</div>
          </div>
          <div style="font-size: 0.75rem; color: var(--secondary); font-weight: 700; margin-bottom: 0.5rem;">
            ${f.toolName} (${f.category})
          </div>
          <p style="font-size: 0.85rem; color: var(--text-main); font-style: italic;">"${f.comments}"</p>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.75rem;">
            ${new Date(f.createdAt).toLocaleDateString()} &bull; Condition: ⭐${f.toolConditionRating}/5 &bull; Service: ⭐${f.serviceRating}/5
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error loading feedback:', err);
    }
  },

  openFeedbackModal(toolId, rentalId) {
    document.getElementById('fdb-toolId').value = toolId;
    document.getElementById('fdb-rentalId').value = rentalId;
    this.openModal('modal-feedback');
  },

  async handleSubmitFeedback(event) {
    event.preventDefault();
    const data = {
      toolId: document.getElementById('fdb-toolId').value,
      rentalId: document.getElementById('fdb-rentalId').value || null,
      rating: document.getElementById('fdb-rating').value,
      comments: document.getElementById('fdb-comments').value
    };

    try {
      const res = await API.submitFeedback(data);
      this.toast(res.message, 'success');
      this.closeModal('modal-feedback');
      this.navigateTo('feedback');
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  // ==========================================
  // 10. PROFILE & PASSWORD
  // ==========================================
  async loadProfile() {
    if (!this.currentUser) return;
    try {
      const current = await API.getMe();
      if (current.success) this.currentUser = current.user;
    } catch (err) {
      this.toast(err.message, 'danger');
      return;
    }
    const u = this.currentUser;
    this.renderSidebarUser();
    const profileValues = {
      'prof-firstName': u.firstName,
      'prof-middleName': u.middleName,
      'prof-lastName': u.lastName,
      'prof-birthday': u.birthday,
      'prof-contact': u.contactNumber,
      'prof-barangay': u.barangay,
      'prof-houseNo': u.houseNumber,
      'prof-street': u.street,
      'prof-email': u.email,
      'prof-status': u.status,
      'prof-role': u.role,
      'prof-member-since': u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—',
      'prof-last-login': u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Not recorded'
    };
    Object.entries(profileValues).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value || '—';
    });
    const picture = document.getElementById('profile-picture-preview');
    const removePictureButton = document.getElementById('remove-profile-picture-btn');
    const hasPicture = /^data:image\/(?:jpeg|png|webp);base64,/.test(u.avatar || '');
    picture.src = hasPicture ? u.avatar : '';
    picture.style.display = hasPicture ? 'block' : 'none';
    removePictureButton.style.display = hasPicture ? 'inline-flex' : 'none';

    const requestList = document.getElementById('my-profile-change-requests');
    try {
      const res = await API.getMyProfileChangeRequests();
      requestList.innerHTML = res.requests.length
        ? res.requests.map(request => `
          <div class="profile-request-item">
            <strong>${this.escapeHTML(request.field)}: ${this.escapeHTML(request.requestedValue)}</strong>
            <span class="badge badge-${request.status.toLowerCase()}">${this.escapeHTML(request.status)}</span>
            <div>${this.escapeHTML(request.reason)}</div>
            ${request.reviewNotes ? `<small>Review: ${this.escapeHTML(request.reviewNotes)}</small>` : ''}
            <small>${new Date(request.createdAt).toLocaleString()}</small>
          </div>
        `).join('')
        : 'No update requests submitted.';
    } catch (err) {
      requestList.textContent = err.message;
    }
  },

  updateProfileRequestValueField() {
    const field = document.getElementById('profile-change-field').value;
    const input = document.getElementById('profile-change-value');
    const label = document.getElementById('profile-change-value-label');
    const labels = {
      firstName: 'Requested first name',
      middleName: 'Requested middle name',
      lastName: 'Requested last name',
      birthday: 'Requested birthday',
      barangay: 'Requested barangay',
      houseNumber: 'Requested house number',
      street: 'Requested street address'
    };
    label.textContent = labels[field];
    input.type = field === 'birthday' ? 'date' : 'text';
    input.max = field === 'birthday' ? new Date().toISOString().slice(0, 10) : '';
    input.value = '';
  },

  async handleProfileChangeRequest(event) {
    event.preventDefault();
    const requestData = {
      field: document.getElementById('profile-change-field').value,
      requestedValue: document.getElementById('profile-change-value').value,
      reason: document.getElementById('profile-change-reason').value,
      notes: document.getElementById('profile-change-notes').value
    };

    try {
      const res = await API.createProfileChangeRequest(requestData);
      this.toast(res.message, 'success');
      event.target.reset();
      this.updateProfileRequestValueField();
      this.loadProfile();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async handleChangePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('pass-current').value;
    const newPassword = document.getElementById('pass-new').value;

    if (!this.isStrongPassword(newPassword)) {
      this.toast('Use at least 8 characters with uppercase, lowercase, a number, and a symbol.', 'warning');
      return;
    }
    if (!window.confirm('Change your account password now?')) return;

    try {
      const res = await API.changePassword({ currentPassword, newPassword });
      this.toast(res.message, 'success');
      document.getElementById('pass-current').value = '';
      document.getElementById('pass-new').value = '';
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  startNotificationPoller() {
    this.refreshNotifications();
    setInterval(() => this.refreshNotifications(), 30000); // 30s low-bandwidth poll
  },

  async refreshNotifications() {
    if (!this.currentUser) return;
    try {
      const res = await API.getMyNotifications();
      if (!res.success) return;

      const badge = document.getElementById('notif-badge');
      if (res.unreadCount > 0) {
        badge.textContent = res.unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }

      const list = document.getElementById('notif-list-wrap');
      if (res.notifications.length === 0) {
        list.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No notifications.</p>`;
        return;
      }

      list.innerHTML = res.notifications.map(n => `
        <div style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); background: ${n.isRead ? '#ffffff' : '#f0fdf4'}; border-radius: 4px; margin-bottom: 4px;">
          <strong style="color: var(--primary-dark); font-size: 0.78rem;">${this.escapeHTML(n.title)}</strong>
          <p style="font-size: 0.75rem; color: var(--text-main); margin: 2px 0;">${this.escapeHTML(n.message)}</p>
          <div style="font-size: 0.65rem; color: var(--text-muted);">${new Date(n.createdAt).toLocaleTimeString()}</div>
          <div style="display:flex; gap:0.4rem; margin-top:0.35rem;">
            ${n.isRead ? '' : `<button onclick="App.markNotificationRead('${this.escapeHTML(n.notificationId)}')" class="btn btn-sm btn-outline">Mark read</button>`}
            <button onclick="App.deleteNotification('${this.escapeHTML(n.notificationId)}')" class="btn btn-sm btn-outline">Delete</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      this.toast(err.message, 'warning');
    }
  },

  toggleNotificationsDropdown() {
    const dd = document.getElementById('notif-dropdown');
    dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
  },

  async markAllNotificationsRead() {
    try {
      await API.markAllNotificationsRead();
      await this.refreshNotifications();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async markNotificationRead(id) {
    try {
      await API.markNotificationRead(id);
      await this.refreshNotifications();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async deleteNotification(id) {
    try {
      await API.deleteNotification(id);
      await this.refreshNotifications();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  async clearNotifications() {
    if (!window.confirm('Clear all of your notifications?')) return;
    try {
      await API.clearNotifications();
      await this.refreshNotifications();
    } catch (err) {
      this.toast(err.message, 'danger');
    }
  },

  // Modal helpers
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('show');
  },

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('show');
  }
};

// Bootstrap application on window load
window.addEventListener('DOMContentLoaded', () => App.init());
