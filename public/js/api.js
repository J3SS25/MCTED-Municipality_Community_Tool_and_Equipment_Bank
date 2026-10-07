// API Client for MCTEB System - Municipality of Basco, Batanes

const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = options.headers || {};

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth & User
  getMetadata() {
    return this.request('/auth/metadata');
  },
  register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },
  logout() {
    return this.request('/auth/logout', { method: 'POST' });
  },
  getMe() {
    return this.request('/auth/me');
  },
  updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },
  changePassword(passwordData) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData)
    });
  },
  forgotPassword(data) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getAllUsers() {
    return this.request('/auth/users');
  },
  updateUserStatus(userId, statusData) {
    return this.request(`/auth/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(statusData)
    });
  },

  // Tool Catalog & Inventory
  getTools(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.condition) params.append('condition', filters.condition);
    if (filters.search) params.append('search', filters.search);
    if (filters.includeArchived) params.append('includeArchived', 'true');
    return this.request(`/tools?${params.toString()}`);
  },
  getToolById(id) {
    return this.request(`/tools/${id}`);
  },
  createTool(formData) {
    return this.request('/tools', {
      method: 'POST',
      body: formData
    });
  },
  updateTool(id, formData) {
    return this.request(`/tools/${id}`, {
      method: 'PUT',
      body: formData
    });
  },
  deleteTool(id) {
    return this.request(`/tools/${id}`, { method: 'DELETE' });
  },

  // Reservations
  getReservations(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.toolId) params.append('toolId', filters.toolId);
    if (filters.userId) params.append('userId', filters.userId);
    return this.request(`/reservations?${params.toString()}`);
  },
  getReservationById(id) {
    return this.request(`/reservations/${id}`);
  },
  createReservation(data) {
    return this.request('/reservations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  approveReservation(id, staffNotes) {
    return this.request(`/reservations/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ staffNotes })
    });
  },
  rejectReservation(id, staffNotes) {
    return this.request(`/reservations/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ staffNotes })
    });
  },
  cancelReservation(id) {
    return this.request(`/reservations/${id}/cancel`, { method: 'PUT' });
  },

  // Rentals & Borrowing
  getRentals(filters = {}) {
    const params = new URLSearchParams();
    if (filters.rentalStatus) params.append('rentalStatus', filters.rentalStatus);
    if (filters.toolId) params.append('toolId', filters.toolId);
    if (filters.userId) params.append('userId', filters.userId);
    return this.request(`/rentals?${params.toString()}`);
  },
  getRentalById(id) {
    return this.request(`/rentals/${id}`);
  },
  checkoutEquipment(data) {
    return this.request('/rentals/checkout', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  returnEquipment(id, data) {
    return this.request(`/rentals/${id}/return`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Payments & Receipts
  getPayments(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    if (filters.userId) params.append('userId', filters.userId);
    return this.request(`/payments?${params.toString()}`);
  },
  getPaymentById(id) {
    return this.request(`/payments/${id}`);
  },
  getReceipt(receiptId) {
    return this.request(`/payments/receipt/${receiptId}`);
  },
  submitPayment(formData) {
    return this.request('/payments', {
      method: 'POST',
      body: formData
    });
  },
  verifyPayment(id, statusData) {
    return this.request(`/payments/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify(statusData)
    });
  },

  // Maintenance & Damages
  getMaintenance(filters = {}) {
    const params = new URLSearchParams();
    if (filters.toolId) params.append('toolId', filters.toolId);
    if (filters.status) params.append('status', filters.status);
    if (filters.severity) params.append('severity', filters.severity);
    return this.request(`/maintenance?${params.toString()}`);
  },
  getMaintenanceById(id) {
    return this.request(`/maintenance/${id}`);
  },
  reportDamage(data) {
    return this.request('/maintenance/report', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateMaintenance(id, data) {
    return this.request(`/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Feedback
  getFeedback(filters = {}) {
    const params = new URLSearchParams();
    if (filters.toolId) params.append('toolId', filters.toolId);
    if (filters.userId) params.append('userId', filters.userId);
    return this.request(`/feedback?${params.toString()}`);
  },
  submitFeedback(data) {
    return this.request('/feedback', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Notifications
  getMyNotifications() {
    return this.request('/notifications/my');
  },
  markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  },
  markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'PUT' });
  },

  // Dashboard & Exports
  getDashboardStats() {
    return this.request('/dashboard/stats');
  }
};
