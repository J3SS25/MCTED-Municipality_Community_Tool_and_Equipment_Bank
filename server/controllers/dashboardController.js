const db = require('../../db/database');
const toolRepository = require('../repositories/toolRepository');
const reservationRepository = require('../repositories/reservationRepository');
const rentalRepository = require('../repositories/rentalRepository');
const paymentRepository = require('../repositories/paymentRepository');
const maintenanceRepository = require('../repositories/maintenanceRepository');
const userRepository = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');
const constants = require('../config/constants');

class DashboardController {
  async getStats(req, res) {
    try {
      const user = req.user;
      const isStaffOrAdmin = user && (user.role === constants.USER_ROLES.ADMIN || user.role === constants.USER_ROLES.STAFF);

      const allTools = await toolRepository.getAll({ includeArchived: false });
      const allReservations = await reservationRepository.getAll();
      const allRentals = await rentalRepository.getAll();
      const allPayments = await paymentRepository.getAll();
      const allMaintenance = await maintenanceRepository.getAll();
      const allUsers = isStaffOrAdmin ? await userRepository.getAll() : [];
      const recentLogs = isStaffOrAdmin ? await auditRepository.getAll(15) : [];

      // System-wide counts
      const toolsCount = allTools.length;
      const availableTools = allTools.filter(t => t.availabilityStatus === constants.TOOL_STATUS.AVAILABLE).length;
      const borrowedTools = allTools.filter(t => t.availabilityStatus === constants.TOOL_STATUS.BORROWED).length;
      const maintenanceTools = allTools.filter(t => t.availabilityStatus === constants.TOOL_STATUS.MAINTENANCE || t.availabilityStatus === constants.TOOL_STATUS.DAMAGED).length;

      const pendingReservations = allReservations.filter(r => r.status === constants.RESERVATION_STATUS.PENDING).length;
      const approvedReservations = allReservations.filter(r => r.status === constants.RESERVATION_STATUS.APPROVED).length;

      const activeRentals = allRentals.filter(r => r.rentalStatus === constants.RENTAL_STATUS.BORROWED).length;
      const completedRentals = allRentals.filter(r => r.rentalStatus === constants.RENTAL_STATUS.COMPLETED).length;

      const totalRevenue = allPayments
        .filter(p => p.paymentStatus === constants.PAYMENT_STATUS.PAID)
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      // User specific counts if borrower
      let userStats = null;
      if (user) {
        const myReservations = allReservations.filter(r => r.userId === user.userId);
        const myRentals = allRentals.filter(r => r.userId === user.userId);
        const myPayments = allPayments.filter(p => p.userId === user.userId);

        userStats = {
          myPendingReservations: myReservations.filter(r => r.status === constants.RESERVATION_STATUS.PENDING).length,
          myApprovedReservations: myReservations.filter(r => r.status === constants.RESERVATION_STATUS.APPROVED).length,
          myActiveRentals: myRentals.filter(r => r.rentalStatus === constants.RENTAL_STATUS.BORROWED).length,
          myCompletedRentals: myRentals.filter(r => r.rentalStatus === constants.RENTAL_STATUS.COMPLETED).length,
          myTotalPaid: myPayments.filter(p => p.paymentStatus === constants.PAYMENT_STATUS.PAID).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
        };
      }

      // Category breakdown
      const categoryDistribution = {};
      constants.TOOL_CATEGORIES.forEach(cat => {
        categoryDistribution[cat] = allTools.filter(t => t.category === cat).length;
      });

      res.json({
        success: true,
        stats: {
          toolsCount,
          availableTools,
          borrowedTools,
          maintenanceTools,
          pendingReservations,
          approvedReservations,
          activeRentals,
          completedRentals,
          totalRevenue,
          totalBorrowers: allUsers.filter(u => u.role === constants.USER_ROLES.BORROWER).length,
          categoryDistribution,
          userStats,
          recentLogs: isStaffOrAdmin ? recentLogs : []
        }
      });
    } catch (err) {
      console.error('Dashboard stats error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Export data in JSON or generate MySQL SQL
  async exportData(req, res) {
    try {
      const type = req.query.format || 'json';
      if (type === 'sql') {
        const sql = db.exportToMySQL();
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', 'attachment; filename="basco_mcteb_export.sql"');
        return res.send(sql);
      }

      const exportBundle = {
        exportedAt: new Date().toISOString(),
        municipality: constants.MUNICIPALITY,
        data: db.cache
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="basco_mcteb_backup.json"');
      res.json(exportBundle);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new DashboardController();
