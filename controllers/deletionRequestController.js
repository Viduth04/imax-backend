import DeletionRequest from '../models/DeletionRequest.js';
import User from '../models/User.js';

// Create deletion request (Technician)
export const createDeletionRequest = async (req, res) => {
  try {
    const { reason } = req.body;

    // Check if technician already has a pending request
    const existingRequest = await DeletionRequest.findOne({
      technician: req.user._id,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending deletion request'
      });
    }

    const deletionRequest = await DeletionRequest.create({
      technician: req.user._id,
      reason
    });

    // Update technician status
    await User.findByIdAndUpdate(req.user._id, {
      status: 'pending-deletion'
    });

    const populatedRequest = await DeletionRequest.findById(deletionRequest._id)
      .populate('technician', 'name email specialization');

    res.status(201).json({
      success: true,
      message: 'Deletion request submitted successfully',
      deletionRequest: populatedRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all deletion requests (Admin)
export const getAllDeletionRequests = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) query.status = status;

    const deletionRequests = await DeletionRequest.find(query)
      .populate('technician', 'name email phone specialization experience')
      .populate('reviewedBy', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      deletionRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get technician's deletion request
export const getMyDeletionRequest = async (req, res) => {
  try {
    const deletionRequest = await DeletionRequest.findOne({
      technician: req.user._id
    })
      .populate('reviewedBy', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      deletionRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Approve deletion request (Admin)
export const approveDeletionRequest = async (req, res) => {
  try {
    const { adminResponse } = req.body;
    const deletionRequest = await DeletionRequest.findById(req.params.id);

    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found'
      });
    }

    if (deletionRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    deletionRequest.status = 'approved';
    deletionRequest.adminResponse = adminResponse || 'Request approved';
    deletionRequest.reviewedBy = req.user._id;
    deletionRequest.reviewedAt = new Date();
    await deletionRequest.save();

    // Delete technician account
    await User.findByIdAndDelete(deletionRequest.technician);

    res.json({
      success: true,
      message: 'Deletion request approved and technician account deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reject deletion request (Admin)
export const rejectDeletionRequest = async (req, res) => {
  try {
    const { adminResponse } = req.body;
    const deletionRequest = await DeletionRequest.findById(req.params.id);

    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found'
      });
    }

    if (deletionRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    deletionRequest.status = 'rejected';
    deletionRequest.adminResponse = adminResponse || 'Request rejected';
    deletionRequest.reviewedBy = req.user._id;
    deletionRequest.reviewedAt = new Date();
    await deletionRequest.save();

    // Restore technician status to active
    await User.findByIdAndUpdate(deletionRequest.technician, {
      status: 'active'
    });

    const updatedRequest = await DeletionRequest.findById(deletionRequest._id)
      .populate('technician', 'name email specialization')
      .populate('reviewedBy', 'name email');

    res.json({
      success: true,
      message: 'Deletion request rejected',
      deletionRequest: updatedRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Cancel deletion request (Technician)
export const cancelDeletionRequest = async (req, res) => {
  try {
    const deletionRequest = await DeletionRequest.findOne({
      technician: req.user._id,
      status: 'pending'
    });

    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'No pending deletion request found'
      });
    }

    await DeletionRequest.findByIdAndDelete(deletionRequest._id);

    // Restore technician status to active
    await User.findByIdAndUpdate(req.user._id, {
      status: 'active'
    });

    res.json({
      success: true,
      message: 'Deletion request cancelled'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get deletion request statistics (Admin)
export const getDeletionRequestStats = async (req, res) => {
  try {
    const totalRequests = await DeletionRequest.countDocuments();
    const pendingRequests = await DeletionRequest.countDocuments({ status: 'pending' });
    const approvedRequests = await DeletionRequest.countDocuments({ status: 'approved' });
    const rejectedRequests = await DeletionRequest.countDocuments({ status: 'rejected' });

    res.json({
      success: true,
      stats: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};