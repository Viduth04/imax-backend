import SupportTicket from '../models/SupportTicket.js';
import { sendEmail } from '../utils/emailService.js';

// Create support ticket
export const createSupportTicket = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    const { subject, category, priority, description } = req.body;
    
    // Check if user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    // Validate required fields
    if (!subject || !category || !priority || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const ticket = new SupportTicket({
      user: req.user._id,
      subject,
      category,
      priority,
      description,
      status: 'open', // Add default status if your schema requires it
      createdAt: new Date()
    });

    const savedTicket = await ticket.save();
    const populatedTicket = await SupportTicket.findById(savedTicket._id)
      .populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: populatedTicket
    });
  } catch (error) {
    console.error('Support ticket creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating support ticket',
      error: error.message
    });
  }
};
// Get user's support tickets
export const getUserTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { user: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const tickets = await SupportTicket.find(query)
      .populate('user', 'name email')
      .populate('repliedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SupportTicket.countDocuments(query);

    res.json({
      success: true,
      tickets,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching support tickets',
      error: error.message
    });
  }
};

// Get all support tickets (Admin)
export const getAllTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, priority } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const tickets = await SupportTicket.find(query)
      .populate('user', 'name email')
      .populate('repliedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SupportTicket.countDocuments(query);

    res.json({
      success: true,
      tickets,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching support tickets',
      error: error.message
    });
  }
};

// Update ticket status and reply (Admin)
export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReply } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (adminReply) {
      updateData.adminReply = adminReply;
      updateData.repliedAt = new Date();
      updateData.repliedBy = req.user._id;
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('user', 'name email').populate('repliedBy', 'name');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Send email if reply is added
    if (adminReply) {
      await sendEmail({
        to: ticket.user.email,
        subject: `Reply to Your Support Ticket - #${ticket._id}`,
        template: 'ticketReply',
        data: {
          userName: ticket.user.name,
          ticketId: ticket._id,
          subject: ticket.subject,
          adminReply,
          repliedBy: req.user.name
        }
      });
    }

    res.json({
      success: true,
      message: 'Support ticket updated successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating support ticket',
      error: error.message
    });
  }
};

// Delete support ticket (Admin)
export const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await SupportTicket.findByIdAndDelete(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    res.json({
      success: true,
      message: 'Support ticket deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting support ticket',
      error: error.message
    });
  }
};

// Get ticket statistics (Admin)
export const getTicketStats = async (req, res) => {
  try {
    const stats = await SupportTicket.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await SupportTicket.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        status: stats,
        category: categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching ticket statistics',
      error: error.message
    });
  }
};