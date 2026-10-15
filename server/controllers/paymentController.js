const paymentRepository = require('../repositories/paymentRepository');
const reservationRepository = require('../repositories/reservationRepository');
const toolRepository = require('../repositories/toolRepository');
const userRepository = require('../repositories/userRepository');
const notificationRepository = require('../repositories/notificationRepository');
const auditRepository = require('../repositories/auditRepository');
const constants = require('../config/constants');

/** @typedef {import('../../types/contracts').PaymentSubmission} PaymentSubmission */

class PaymentController {
  // Get all payments
  async getAll(req, res) {
    try {
      const { status, paymentMethod } = req.query;
      const filters = { status, paymentMethod };

      if (req.user.role === constants.USER_ROLES.BORROWER) {
        filters.userId = req.user.userId;
      } else if (req.query.userId) {
        filters.userId = req.query.userId;
      }

      const list = await paymentRepository.getAll(filters);

      const hydrated = await Promise.all(
        list.map(async (p) => {
          const tool = await toolRepository.getById(p.toolId);
          const user = await userRepository.getById(p.userId);
          return {
            ...p,
            toolName: tool ? tool.toolName : 'Tool',
            category: tool ? tool.category : '',
            payerName: user ? `${user.firstName} ${user.lastName}` : 'Resident',
            payerContact: user ? user.contactNumber : '',
            payerBarangay: user ? user.barangay : ''
          };
        })
      );

      res.json({ success: true, count: hydrated.length, payments: hydrated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Get payment by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const payment = await paymentRepository.getById(id);
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found.' });
      }

      if (req.user.role === constants.USER_ROLES.BORROWER && payment.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
      }

      const tool = await toolRepository.getById(payment.toolId);
      const user = await userRepository.getById(payment.userId);

      res.json({
        success: true,
        payment: {
          ...payment,
          toolName: tool ? tool.toolName : 'Tool',
          category: tool ? tool.category : '',
          rentalFee: tool ? tool.rentalFee : 0,
          depositFee: tool ? tool.depositFee : 0,
          payerName: user ? `${user.firstName} ${user.lastName}` : 'Resident',
          payerEmail: user ? user.email : '',
          payerContact: user ? user.contactNumber : '',
          payerBarangay: user ? user.barangay : ''
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Get official electronic receipt
  async getReceipt(req, res) {
    try {
      const { receiptId } = req.params;
      const payment = await paymentRepository.getByReceiptId(receiptId);
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Receipt not found.' });
      }

      if (req.user.role === constants.USER_ROLES.BORROWER && payment.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
      }

      const tool = await toolRepository.getById(payment.toolId);
      const user = await userRepository.getById(payment.userId);
      const reservation = payment.reservationId ? await reservationRepository.getById(payment.reservationId) : null;

      const receipt = {
        receiptId: payment.receiptId,
        paymentId: payment.paymentId,
        municipality: constants.MUNICIPALITY,
        payer: {
          userId: user ? user.userId : payment.userId,
          name: user ? `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}` : 'Resident',
          barangay: user ? user.barangay : 'Basco',
          contactNumber: user ? user.contactNumber : '',
          address: user ? `${user.houseNumber} ${user.street}, Brgy. ${user.barangay}, Basco, Batanes` : ''
        },
        equipment: {
          toolId: tool ? tool.toolId : payment.toolId,
          toolName: tool ? tool.toolName : 'Municipal Tool',
          category: tool ? tool.category : 'General',
          rentalFee: tool ? tool.rentalFee : payment.amount
        },
        reservation: reservation ? {
          reservationId: reservation.reservationId,
          pickupDate: reservation.pickupDate,
          returnDate: reservation.returnDate,
          purpose: reservation.purpose
        } : null,
        transaction: {
          amountPaid: payment.amount,
          paymentMethod: payment.paymentMethod,
          referenceNumber: payment.referenceNumber,
          paymentDate: payment.paymentDate,
          paymentStatus: payment.paymentStatus,
          verifiedBy: payment.verifiedBy || 'Municipal Staff / System',
          verifiedAt: payment.verifiedAt || payment.paymentDate
        },
        issuedAt: payment.createdAt || new Date().toISOString()
      };

      res.json({ success: true, receipt });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Submit payment (Borrower or Counter Staff)
  /** @param {import('express').Request<{}, {}, PaymentSubmission>} req */
  async submitPayment(req, res) {
    try {
      const {
        reservationId,
        toolId,
        amount,
        referenceNumber,
        paymentMethod,
        notes
      } = req.body;

      const parsedAmount = Number(amount);
      if (!toolId || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'A tool, a valid positive amount, and a payment method are required.'
        });
      }

      const tool = await toolRepository.getById(toolId);
      if (!tool) {
        return res.status(404).json({ success: false, message: 'Tool not found.' });
      }

      let proofImage = '';
      if (req.file) {
        proofImage = `/uploads/${req.file.filename}`;
      }

      // If submitted by staff directly or cash at counter, can auto-verify or mark paid
      const isStaffOrAdmin = req.user.role === constants.USER_ROLES.STAFF || req.user.role === constants.USER_ROLES.ADMIN;
      const initialStatus = constants.PAYMENT_STATUS.PAID;

      const payment = await paymentRepository.create({
        userId: req.user.userId,
        reservationId: reservationId || null,
        toolId,
        amount: parsedAmount,
        referenceNumber: referenceNumber || `REF-${Date.now()}`,
        paymentMethod,
        paymentStatus: initialStatus,
        proofImage,
        verifiedBy: isStaffOrAdmin ? req.user.userId : 'Automated Payment Gateway',
        verifiedAt: new Date().toISOString(),
        notes: notes || ''
      });

      // Notification
      await notificationRepository.create({
        userId: req.user.userId,
        title: 'Payment Confirmed & Official Receipt Issued',
        message: `Your payment of ₱${parsedAmount.toFixed(2)} via ${paymentMethod} has been recorded (Official Receipt: ${payment.receiptId}).`,
        type: 'success',
        link: `/receipts/${payment.receiptId}`
      });

      await auditRepository.log(
        'PAYMENT_RECORD',
        'Payment',
        payment.paymentId,
        `Payment of ₱${amount} recorded via ${paymentMethod} (OR: ${payment.receiptId}) for ${tool ? tool.toolName : toolId}`,
        req.user,
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Payment recorded and Official Electronic Receipt generated!',
        payment
      });
    } catch (err) {
      console.error('Submit payment error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Verify payment (Staff / Admin)
  async verifyPayment(req, res) {
    try {
      const { id } = req.params;
      const { paymentStatus, notes } = req.body;

      const payment = await paymentRepository.getById(id);
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found.' });
      }

      const updated = await paymentRepository.update(id, {
        paymentStatus: paymentStatus || constants.PAYMENT_STATUS.PAID,
        verifiedBy: req.user.userId,
        verifiedAt: new Date().toISOString(),
        notes: notes || payment.notes
      });

      await notificationRepository.create({
        userId: payment.userId,
        title: 'Payment Verified',
        message: `Your payment (${payment.receiptId}) has been verified by the municipal staff.`,
        type: 'success'
      });

      await auditRepository.log(
        'PAYMENT_VERIFY',
        'Payment',
        id,
        `Staff ${req.user.userId} verified payment ${payment.receiptId} -> ${paymentStatus}`,
        req.user,
        req.ip
      );

      res.json({
        success: true,
        message: 'Payment verification updated.',
        payment: updated
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new PaymentController();
