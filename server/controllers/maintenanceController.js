const maintenanceRepository = require('../repositories/maintenanceRepository');
const toolRepository = require('../repositories/toolRepository');
const userRepository = require('../repositories/userRepository');
const notificationRepository = require('../repositories/notificationRepository');
const auditRepository = require('../repositories/auditRepository');
const constants = require('../config/constants');

class MaintenanceController {
  // Get all maintenance tickets
  async getAll(req, res) {
    try {
      const { toolId, status, severity } = req.query;
      const list = await maintenanceRepository.getAll({ toolId, status, severity });

      const hydrated = await Promise.all(
        list.map(async (m) => {
          const tool = await toolRepository.getById(m.toolId);
          const reporter = await userRepository.getById(m.reportedBy);
          return {
            ...m,
            toolName: tool ? tool.toolName : 'Tool',
            category: tool ? tool.category : '',
            reporterName: reporter ? `${reporter.firstName} ${reporter.lastName}` : 'System / User'
          };
        })
      );

      res.json({ success: true, count: hydrated.length, tickets: hydrated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Get ticket by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const ticket = await maintenanceRepository.getById(id);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
      }

      const tool = await toolRepository.getById(ticket.toolId);
      const reporter = await userRepository.getById(ticket.reportedBy);

      res.json({
        success: true,
        ticket: {
          ...ticket,
          toolName: tool ? tool.toolName : '',
          category: tool ? tool.category : '',
          reporterName: reporter ? `${reporter.firstName} ${reporter.lastName}` : ''
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Report damaged equipment
  async reportDamage(req, res) {
    try {
      const { toolId, rentalId, issueDescription, severity } = req.body;

      if (!toolId || !issueDescription) {
        return res.status(400).json({
          success: false,
          message: 'Tool ID and issue description are required.'
        });
      }

      const tool = await toolRepository.getById(toolId);
      if (!tool) {
        return res.status(404).json({ success: false, message: 'Tool not found.' });
      }

      const ticket = await maintenanceRepository.create({
        toolId,
        reportedBy: req.user.userId,
        rentalId: rentalId || null,
        issueDescription,
        severity: severity || 'Moderate',
        status: constants.MAINTENANCE_STATUS.REPORTED
      });

      // Update tool condition and status
      await toolRepository.update(toolId, {
        availabilityStatus: constants.TOOL_STATUS.MAINTENANCE,
        equipmentCondition: constants.TOOL_CONDITIONS.NEEDS_REPAIR
      });

      // Notify Staff & Admin
      await notificationRepository.create({
        userId: 'ALL',
        title: 'Equipment Damage / Maintenance Report',
        message: `Issue reported on "${tool.toolName}": ${issueDescription} (Severity: ${severity || 'Moderate'})`,
        type: 'danger',
        link: `/maintenance?id=${ticket.maintenanceId}`
      });

      await auditRepository.log(
        'MAINTENANCE_REPORT',
        'Maintenance',
        ticket.maintenanceId,
        `Damage reported for ${tool.toolName} by ${req.user.userId}: ${issueDescription}`,
        req.user,
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Damage report filed successfully. Equipment scheduled for inspection.',
        ticket
      });
    } catch (err) {
      console.error('Report damage error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Update maintenance / schedule repair (Staff / Admin)
  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        status,
        assignedTechnician,
        estimatedCost,
        actualCost,
        scheduledDate,
        completedDate,
        resolutionNotes,
        restoreToolToAvailable
      } = req.body;

      const ticket = await maintenanceRepository.getById(id);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
      }

      const updates = {};
      if (status) updates.status = status;
      if (assignedTechnician) updates.assignedTechnician = assignedTechnician;
      if (estimatedCost !== undefined) updates.estimatedCost = parseFloat(estimatedCost);
      if (actualCost !== undefined) updates.actualCost = parseFloat(actualCost);
      if (scheduledDate) updates.scheduledDate = scheduledDate;
      if (completedDate) updates.completedDate = completedDate;
      if (resolutionNotes) updates.resolutionNotes = resolutionNotes;

      // If status completed
      if (status === constants.MAINTENANCE_STATUS.COMPLETED || restoreToolToAvailable) {
        updates.completedDate = completedDate || new Date().toISOString().split('T')[0];
        
        // Restore tool status back to Available & Good
        await toolRepository.update(ticket.toolId, {
          availabilityStatus: constants.TOOL_STATUS.AVAILABLE,
          equipmentCondition: constants.TOOL_CONDITIONS.GOOD
        });
      } else if (status === constants.MAINTENANCE_STATUS.DECOMMISSIONED) {
        await toolRepository.update(ticket.toolId, {
          availabilityStatus: constants.TOOL_STATUS.ARCHIVED,
          equipmentCondition: constants.TOOL_CONDITIONS.NEEDS_REPAIR,
          isArchived: true
        });
      }

      const updated = await maintenanceRepository.update(id, updates);

      await auditRepository.log(
        'MAINTENANCE_UPDATE',
        'Maintenance',
        id,
        `Maintenance ticket updated to status=${status || ticket.status}`,
        req.user,
        req.ip
      );

      res.json({
        success: true,
        message: 'Maintenance ticket updated successfully.',
        ticket: updated
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new MaintenanceController();
