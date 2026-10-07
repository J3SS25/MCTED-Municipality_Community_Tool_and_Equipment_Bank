const reservationRepository = require('../repositories/reservationRepository');
const toolRepository = require('../repositories/toolRepository');
const userRepository = require('../repositories/userRepository');
const notificationRepository = require('../repositories/notificationRepository');
const auditRepository = require('../repositories/auditRepository');
const constants = require('../config/constants');

class ReservationController {
  // Get reservations list
  async getAll(req, res) {
    try {
      const { status, toolId } = req.query;
      const filters = { status, toolId };

      // If borrower, only fetch own reservations
      if (req.user.role === constants.USER_ROLES.BORROWER) {
        filters.userId = req.user.userId;
      } else if (req.query.userId) {
        filters.userId = req.query.userId;
      }

      const list = await reservationRepository.getAll(filters);

      // Hydrate with user and tool info
      const hydrated = await Promise.all(
        list.map(async (r) => {
          const tool = await toolRepository.getById(r.toolId);
          const user = await userRepository.getById(r.userId);
          return {
            ...r,
            toolName: tool ? tool.toolName : 'Unknown Tool',
            category: tool ? tool.category : '',
            rentalFee: tool ? tool.rentalFee : 0,
            imagePath: tool ? tool.imagePath : '',
            borrowerName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
            borrowerContact: user ? user.contactNumber : '',
            borrowerBarangay: user ? user.barangay : ''
          };
        })
      );

      res.json({ success: true, count: hydrated.length, reservations: hydrated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Get reservation by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const r = await reservationRepository.getById(id);
      if (!r) {
        return res.status(404).json({ success: false, message: 'Reservation not found.' });
      }

      // Check authorization
      if (req.user.role === constants.USER_ROLES.BORROWER && r.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
      }

      const tool = await toolRepository.getById(r.toolId);
      const user = await userRepository.getById(r.userId);

      res.json({
        success: true,
        reservation: {
          ...r,
          toolName: tool ? tool.toolName : '',
          category: tool ? tool.category : '',
          rentalFee: tool ? tool.rentalFee : 0,
          imagePath: tool ? tool.imagePath : '',
          borrowerName: user ? `${user.firstName} ${user.lastName}` : '',
          borrowerContact: user ? user.contactNumber : '',
          borrowerBarangay: user ? user.barangay : ''
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Create new reservation request
  async create(req, res) {
    try {
      const { toolId, pickupDate, returnDate, purpose } = req.body;
      const userId = req.user.userId;

      if (!toolId || !pickupDate || !returnDate) {
        return res.status(400).json({
          success: false,
          message: 'Tool ID, pickup date, and expected return date are required.'
        });
      }

      const pDate = new Date(pickupDate);
      const rDate = new Date(returnDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (pDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Pickup date cannot be in the past.'
        });
      }

      if (rDate < pDate) {
        return res.status(400).json({
          success: false,
          message: 'Return date must be on or after pickup date.'
        });
      }

      const tool = await toolRepository.getById(toolId);
      if (!tool) {
        return res.status(404).json({ success: false, message: 'Equipment not found in catalog.' });
      }

      if (tool.availabilityStatus === constants.TOOL_STATUS.MAINTENANCE || tool.availabilityStatus === constants.TOOL_STATUS.DAMAGED) {
        return res.status(400).json({
          success: false,
          message: `Equipment is currently unavailable (${tool.availabilityStatus}).`
        });
      }

      const reservation = await reservationRepository.create({
        userId,
        toolId,
        pickupDate,
        returnDate,
        purpose: purpose || 'Community / Livelihood Project in Basco',
        status: constants.RESERVATION_STATUS.PENDING
      });

      // Notify Staff & Admin
      await notificationRepository.create({
        userId: 'ALL',
        title: 'New Equipment Reservation Request',
        message: `${req.user.firstName} ${req.user.lastName} submitted a reservation for "${tool.toolName}" (${pickupDate} to ${returnDate}).`,
        type: 'info',
        link: `/reservations?id=${reservation.reservationId}`
      });

      // Notify Borrower
      await notificationRepository.create({
        userId: req.user.userId,
        title: 'Reservation Request Submitted',
        message: `Your reservation request (${reservation.reservationId}) for "${tool.toolName}" has been submitted for Municipal Staff review.`,
        type: 'info'
      });

      await auditRepository.log(
        'RESERVATION_CREATE',
        'Reservation',
        reservation.reservationId,
        `User ${req.user.userId} reserved ${tool.toolName} from ${pickupDate} to ${returnDate}`,
        req.user,
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Reservation request submitted successfully! Awaiting municipal review.',
        reservation
      });
    } catch (err) {
      console.error('Create reservation error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Approve Reservation (Staff / Admin)
  async approve(req, res) {
    try {
      const { id } = req.params;
      const { staffNotes } = req.body;

      const reservation = await reservationRepository.getById(id);
      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found.' });
      }

      if (reservation.status !== constants.RESERVATION_STATUS.PENDING) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve reservation with current status: ${reservation.status}`
        });
      }

      const tool = await toolRepository.getById(reservation.toolId);

      const updated = await reservationRepository.update(id, {
        status: constants.RESERVATION_STATUS.APPROVED,
        staffNotes: staffNotes || 'Approved by Municipal Staff. Proceed to payment counter or online verification.',
        reviewedBy: req.user.userId,
        reviewedAt: new Date().toISOString()
      });

      // Notify user
      await notificationRepository.create({
        userId: reservation.userId,
        title: 'Reservation Approved!',
        message: `Your reservation for "${tool ? tool.toolName : 'Tool'}" has been APPROVED. Please proceed to payment to confirm pickup on ${reservation.pickupDate}.`,
        type: 'success',
        link: `/payments?reservationId=${id}`
      });

      await auditRepository.log(
        'RESERVATION_APPROVE',
        'Reservation',
        id,
        `Staff ${req.user.userId} approved reservation for tool ${reservation.toolId}`,
        req.user,
        req.ip
      );

      res.json({
        success: true,
        message: 'Reservation approved! Notification sent to borrower.',
        reservation: updated
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Reject Reservation (Staff / Admin)
  async reject(req, res) {
    try {
      const { id } = req.params;
      const { staffNotes } = req.body;

      const reservation = await reservationRepository.getById(id);
      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found.' });
      }

      const tool = await toolRepository.getById(reservation.toolId);

      const updated = await reservationRepository.update(id, {
        status: constants.RESERVATION_STATUS.REJECTED,
        staffNotes: staffNotes || 'Request could not be approved at this time.',
        reviewedBy: req.user.userId,
        reviewedAt: new Date().toISOString()
      });

      await notificationRepository.create({
        userId: reservation.userId,
        title: 'Reservation Request Declined',
        message: `Your reservation request for "${tool ? tool.toolName : 'Tool'}" was declined. Reason: ${staffNotes || 'Schedule conflict or maintenance.'}`,
        type: 'danger'
      });

      await auditRepository.log(
        'RESERVATION_REJECT',
        'Reservation',
        id,
        `Staff ${req.user.userId} rejected reservation: ${staffNotes}`,
        req.user,
        req.ip
      );

      res.json({
        success: true,
        message: 'Reservation rejected.',
        reservation: updated
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Cancel Reservation (Borrower)
  async cancel(req, res) {
    try {
      const { id } = req.params;
      const reservation = await reservationRepository.getById(id);
      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found.' });
      }

      if (req.user.role === constants.USER_ROLES.BORROWER && reservation.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
      }

      if (reservation.status !== constants.RESERVATION_STATUS.PENDING && reservation.status !== constants.RESERVATION_STATUS.APPROVED) {
        return res.status(400).json({
          success: false,
          message: 'Only pending or approved reservations can be cancelled.'
        });
      }

      const updated = await reservationRepository.update(id, {
        status: constants.RESERVATION_STATUS.CANCELLED
      });

      await auditRepository.log(
        'RESERVATION_CANCEL',
        'Reservation',
        id,
        `Reservation cancelled by ${req.user.userId}`,
        req.user,
        req.ip
      );

      res.json({
        success: true,
        message: 'Reservation cancelled successfully.',
        reservation: updated
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ReservationController();
