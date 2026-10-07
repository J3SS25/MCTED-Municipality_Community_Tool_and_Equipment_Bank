const rentalRepository = require('../repositories/rentalRepository');
const reservationRepository = require('../repositories/reservationRepository');
const toolRepository = require('../repositories/toolRepository');
const userRepository = require('../repositories/userRepository');
const maintenanceRepository = require('../repositories/maintenanceRepository');
const notificationRepository = require('../repositories/notificationRepository');
const auditRepository = require('../repositories/auditRepository');
const constants = require('../config/constants');

class RentalController {
  // Get all rentals / rental history
  async getAll(req, res) {
    try {
      const { rentalStatus, toolId } = req.query;
      const filters = { rentalStatus, toolId };

      if (req.user.role === constants.USER_ROLES.BORROWER) {
        filters.userId = req.user.userId;
      } else if (req.query.userId) {
        filters.userId = req.query.userId;
      }

      const list = await rentalRepository.getAll(filters);

      const hydrated = await Promise.all(
        list.map(async (r) => {
          const tool = await toolRepository.getById(r.toolId);
          const user = await userRepository.getById(r.userId);
          const releaser = await userRepository.getById(r.releasedBy);
          
          // Calculate if overdue
          let isOverdue = false;
          if (r.rentalStatus === constants.RENTAL_STATUS.BORROWED && r.dueDate) {
            const dueDate = new Date(r.dueDate);
            const now = new Date();
            isOverdue = now > dueDate;
          }

          return {
            ...r,
            toolName: tool ? tool.toolName : 'Tool',
            category: tool ? tool.category : '',
            rentalFee: tool ? tool.rentalFee : 0,
            imagePath: tool ? tool.imagePath : '',
            borrowerName: user ? `${user.firstName} ${user.lastName}` : 'Resident',
            borrowerContact: user ? user.contactNumber : '',
            borrowerBarangay: user ? user.barangay : '',
            releasedByName: releaser ? `${releaser.firstName} ${releaser.lastName}` : 'Staff',
            isOverdue
          };
        })
      );

      res.json({ success: true, count: hydrated.length, rentals: hydrated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Get rental by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const rental = await rentalRepository.getById(id);
      if (!rental) {
        return res.status(404).json({ success: false, message: 'Rental record not found.' });
      }

      if (req.user.role === constants.USER_ROLES.BORROWER && rental.userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
      }

      const tool = await toolRepository.getById(rental.toolId);
      const user = await userRepository.getById(rental.userId);

      res.json({
        success: true,
        rental: {
          ...rental,
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

  // Equipment Checkout / Release (Staff / Admin)
  async checkout(req, res) {
    try {
      const {
        reservationId,
        userId,
        toolId,
        dueDate,
        initialCondition,
        notes
      } = req.body;

      if (!toolId || !userId || !dueDate) {
        return res.status(400).json({
          success: false,
          message: 'Tool ID, Borrower User ID, and Due Date are required.'
        });
      }

      const tool = await toolRepository.getById(toolId);
      if (!tool) {
        return res.status(404).json({ success: false, message: 'Tool not found.' });
      }

      if (tool.quantityAvailable <= 0) {
        return res.status(400).json({
          success: false,
          message: 'This tool has no available units in stock currently.'
        });
      }

      const rental = await rentalRepository.create({
        reservationId: reservationId || null,
        userId,
        toolId,
        rentalDate: new Date().toISOString(),
        dueDate,
        rentalStatus: constants.RENTAL_STATUS.BORROWED,
        initialCondition: initialCondition || tool.equipmentCondition || 'Good',
        releasedBy: req.user.userId,
        inspectionNotes: notes || 'Equipment inspected and released in operational condition.'
      });

      // Update reservation status if linked
      if (reservationId) {
        await reservationRepository.update(reservationId, {
          status: constants.RESERVATION_STATUS.COMPLETED
        });
      }

      // Decrement tool available quantity & increment usage counter
      await toolRepository.incrementBorrowCount(toolId);

      // Notify borrower
      await notificationRepository.create({
        userId,
        title: 'Equipment Released - Active Rental',
        message: `You have successfully checked out "${tool.toolName}". Expected return due date is ${dueDate}. Please operate with safety gear.`,
        type: 'info'
      });

      await auditRepository.log(
        'EQUIPMENT_CHECKOUT',
        'Rental',
        rental.rentalId,
        `Staff ${req.user.userId} released tool ${tool.toolName} to user ${userId}`,
        req.user,
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Equipment checkout completed successfully!',
        rental
      });
    } catch (err) {
      console.error('Checkout error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Equipment Return Validation (Staff / Admin)
  async returnEquipment(req, res) {
    try {
      const { id } = req.params;
      const {
        returnedCondition,
        inspectionNotes,
        damagePenalty,
        overduePenalty,
        isDamaged
      } = req.body;

      const rental = await rentalRepository.getById(id);
      if (!rental) {
        return res.status(404).json({ success: false, message: 'Rental record not found.' });
      }

      if (rental.rentalStatus === constants.RENTAL_STATUS.RETURNED || rental.rentalStatus === constants.RENTAL_STATUS.COMPLETED) {
        return res.status(400).json({ success: false, message: 'This rental has already been marked returned.' });
      }

      const now = new Date().toISOString();
      const condition = returnedCondition || constants.TOOL_CONDITIONS.GOOD;

      const updatedRental = await rentalRepository.update(id, {
        rentalStatus: constants.RENTAL_STATUS.COMPLETED,
        actualReturnDate: now,
        returnedCondition: condition,
        receivedBy: req.user.userId,
        inspectionNotes: inspectionNotes || 'Equipment returned and inspected.',
        overduePenalty: parseFloat(overduePenalty) || 0,
        damagePenalty: parseFloat(damagePenalty) || 0
      });

      const tool = await toolRepository.getById(rental.toolId);

      // Update Tool inventory
      let nextToolCondition = condition;
      if (isDamaged || condition === constants.TOOL_CONDITIONS.NEEDS_REPAIR || condition === 'Damaged') {
        nextToolCondition = constants.TOOL_CONDITIONS.NEEDS_REPAIR;

        // Automatically create maintenance ticket
        await maintenanceRepository.create({
          toolId: rental.toolId,
          reportedBy: req.user.userId,
          rentalId: rental.rentalId,
          issueDescription: inspectionNotes || `Equipment damaged upon return from rental ${rental.rentalId}. Condition: ${condition}`,
          severity: 'Moderate',
          status: constants.MAINTENANCE_STATUS.REPORTED
        });

        await toolRepository.update(rental.toolId, {
          availabilityStatus: constants.TOOL_STATUS.MAINTENANCE,
          equipmentCondition: constants.TOOL_CONDITIONS.NEEDS_REPAIR
        });
      } else {
        await toolRepository.returnTool(rental.toolId, condition);
      }

      // Notify Borrower
      await notificationRepository.create({
        userId: rental.userId,
        title: 'Equipment Return Processed',
        message: `Your return for "${tool ? tool.toolName : 'Tool'}" has been validated and completed. Thank you for using Basco MCTEB! Please leave your feedback.`,
        type: 'success',
        link: `/feedback?rentalId=${rental.rentalId}`
      });

      await auditRepository.log(
        'EQUIPMENT_RETURN',
        'Rental',
        id,
        `Staff ${req.user.userId} received returned tool ${tool ? tool.toolName : rental.toolId} (Condition: ${condition})`,
        req.user,
        req.ip
      );

      res.json({
        success: true,
        message: 'Equipment return and inspection completed successfully!',
        rental: updatedRental
      });
    } catch (err) {
      console.error('Return error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new RentalController();
