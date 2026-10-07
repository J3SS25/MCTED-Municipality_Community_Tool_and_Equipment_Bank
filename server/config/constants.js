// Municipality of Basco, Batanes - System Constants
module.exports = {
  MUNICIPALITY: {
    NAME: 'Municipality of Basco',
    PROVINCE: 'Batanes',
    ZIP_CODE: '3900',
    OFFICE: 'Municipal Agriculture & Engineering Office / Community Tool Bank',
    SYSTEM_NAME: 'Municipal Community Tool and Equipment Bank (MCTEB)',
    CONTACT: '(078) 533-3456 / lgu.basco@batanes.gov.ph',
    ADDRESS: 'National Road, Barangay Kayvaluganan (Ihuvok II), Basco, Batanes'
  },

  // 6 Barangays of Basco, Batanes
  BARANGAYS: [
    'Ihuvok I (Kaychanarianan)',
    'Ihuvok II (Kayvaluganan)',
    'San Antonio',
    'San Joaquin',
    'Chanarian',
    'Kayhuvokan'
  ],

  // User Roles
  USER_ROLES: {
    ADMIN: 'Administrator',
    STAFF: 'Municipal Staff',
    BORROWER: 'Borrower'
  },

  // User Status
  USER_STATUS: {
    ACTIVE: 'Active',
    PENDING: 'Pending Verification',
    SUSPENDED: 'Suspended'
  },

  // Tool Categories
  TOOL_CATEGORIES: [
    'Agricultural Tools',
    'Fishing Equipment',
    'Carpentry Tools',
    'Construction Tools',
    'Electrical Tools',
    'Mechanical Tools',
    'Emergency Response Equipment'
  ],

  // Tool Status
  TOOL_STATUS: {
    AVAILABLE: 'Available',
    RESERVED: 'Reserved',
    BORROWED: 'Borrowed',
    RETURNED: 'Returned',
    MAINTENANCE: 'Maintenance',
    DAMAGED: 'Damaged',
    ARCHIVED: 'Archived'
  },

  // Tool Condition
  TOOL_CONDITIONS: {
    EXCELLENT: 'Excellent',
    GOOD: 'Good',
    FAIR: 'Fair',
    NEEDS_REPAIR: 'Needs Repair',
    UNDER_MAINTENANCE: 'Under Maintenance'
  },

  // Reservation Status
  RESERVATION_STATUS: {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed'
  },

  // Rental Status
  RENTAL_STATUS: {
    PENDING: 'Pending',
    RESERVED: 'Reserved',
    BORROWED: 'Borrowed',
    RETURNED: 'Returned',
    COMPLETED: 'Completed'
  },

  // Payment Methods
  PAYMENT_METHODS: {
    GCASH: 'GCash',
    MAYA: 'Maya',
    BANK_TRANSFER: 'Bank Transfer (Landbank/BDO)',
    CASH: 'Cash at Municipal Treasury'
  },

  // Payment Status
  PAYMENT_STATUS: {
    PENDING: 'Pending',
    PAID: 'Paid',
    FAILED: 'Failed',
    REFUNDED: 'Refunded'
  },

  // Maintenance Status
  MAINTENANCE_STATUS: {
    REPORTED: 'Reported',
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    DECOMMISSIONED: 'Decommissioned'
  },

  JWT_SECRET: process.env.JWT_SECRET || 'basco_mcteb_secure_jwt_secret_2026_key'
};
