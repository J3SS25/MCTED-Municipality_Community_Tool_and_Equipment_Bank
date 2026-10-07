const toolRepository = require('../repositories/toolRepository');
const feedbackRepository = require('../repositories/feedbackRepository');
const reservationRepository = require('../repositories/reservationRepository');
const auditRepository = require('../repositories/auditRepository');
const constants = require('../config/constants');

class ToolController {
  // Get all tools with filters
  async getAll(req, res) {
    try {
      const { category, status, condition, search, includeArchived } = req.query;
      const tools = await toolRepository.getAll({
        category,
        status,
        condition,
        search,
        includeArchived: includeArchived === 'true'
      });

      // Enrich with average ratings
      const enriched = await Promise.all(
        tools.map(async (tool) => {
          const ratingData = await feedbackRepository.getAverageRatingForTool(tool.toolId);
          return {
            ...tool,
            avgRating: ratingData.avgRating,
            reviewCount: ratingData.count
          };
        })
      );

      res.json({ success: true, count: enriched.length, tools: enriched });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Get tool by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const tool = await toolRepository.getById(id);
      if (!tool) {
        return res.status(404).json({ success: false, message: 'Tool not found.' });
      }

      const ratingData = await feedbackRepository.getAverageRatingForTool(id);
      const reviews = await feedbackRepository.getAll({ toolId: id });
      
      // Get active reservations for availability inspection
      const activeReservations = await reservationRepository.getAll({
        toolId: id,
        status: constants.RESERVATION_STATUS.APPROVED
      });

      res.json({
        success: true,
        tool: {
          ...tool,
          avgRating: ratingData.avgRating,
          reviewCount: ratingData.count,
          reviews: reviews.slice(0, 10),
          activeReservations: activeReservations.map(r => ({
            pickupDate: r.pickupDate,
            returnDate: r.returnDate,
            status: r.status
          }))
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Create new tool (Admin / Staff)
  async create(req, res) {
    try {
      const {
        toolName,
        category,
        description,
        specifications,
        availabilityStatus,
        equipmentCondition,
        rentalFee,
        depositFee,
        quantityTotal,
        imagePath,
        serialNumber,
        acquisitionDate
      } = req.body;

      if (!toolName || !category || rentalFee === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Tool Name, Category, and Rental Fee are required.'
        });
      }

      if (!constants.TOOL_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Category must be one of: ${constants.TOOL_CATEGORIES.join(', ')}`
        });
      }

      let uploadedImage = imagePath || '';
      if (req.file) {
        uploadedImage = `/uploads/${req.file.filename}`;
      }

      const newTool = await toolRepository.create({
        toolName,
        category,
        description,
        specifications,
        availabilityStatus: availabilityStatus || constants.TOOL_STATUS.AVAILABLE,
        equipmentCondition: equipmentCondition || constants.TOOL_CONDITIONS.GOOD,
        rentalFee: parseFloat(rentalFee) || 0,
        depositFee: parseFloat(depositFee) || 0,
        quantityTotal: parseInt(quantityTotal, 10) || 1,
        quantityAvailable: parseInt(quantityTotal, 10) || 1,
        imagePath: uploadedImage,
        serialNumber,
        acquisitionDate
      });

      await auditRepository.log(
        'TOOL_CREATE',
        'Tool',
        newTool.toolId,
        `Added new tool ${newTool.toolName} (${newTool.category})`,
        req.user,
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Tool successfully added to Basco MCTEB inventory.',
        tool: newTool
      });
    } catch (err) {
      console.error('Create tool error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Update tool
  async update(req, res) {
    try {
      const { id } = req.params;
      const tool = await toolRepository.getById(id);
      if (!tool) {
        return res.status(404).json({ success: false, message: 'Tool not found.' });
      }

      const updates = { ...req.body };
      if (req.file) {
        updates.imagePath = `/uploads/${req.file.filename}`;
      }

      if (updates.rentalFee !== undefined) updates.rentalFee = parseFloat(updates.rentalFee);
      if (updates.depositFee !== undefined) updates.depositFee = parseFloat(updates.depositFee);
      if (updates.quantityTotal !== undefined) updates.quantityTotal = parseInt(updates.quantityTotal, 10);
      if (updates.quantityAvailable !== undefined) updates.quantityAvailable = parseInt(updates.quantityAvailable, 10);

      const updatedTool = await toolRepository.update(id, updates);

      await auditRepository.log(
        'TOOL_UPDATE',
        'Tool',
        id,
        `Updated tool ${tool.toolName} details/status`,
        req.user,
        req.ip
      );

      res.json({
        success: true,
        message: 'Tool updated successfully.',
        tool: updatedTool
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Delete / Archive tool
  async delete(req, res) {
    try {
      const { id } = req.params;
      const tool = await toolRepository.getById(id);
      if (!tool) {
        return res.status(404).json({ success: false, message: 'Tool not found.' });
      }

      await toolRepository.delete(id);

      await auditRepository.log(
        'TOOL_ARCHIVE',
        'Tool',
        id,
        `Archived tool ${tool.toolName}`,
        req.user,
        req.ip
      );

      res.json({ success: true, message: 'Tool archived from catalog successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ToolController();
