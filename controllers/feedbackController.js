import Feedback from '../models/Feedback.js';
// Create feedback
export const createFeedback = async (req, res) => {
  try {
    const { subject, category, rating, message, isAnonymous } = req.body;
    
    const feedback = new Feedback({
      user: req.user._id,
      subject,
      category,
      rating,
      message,
      isAnonymous
    });

    await feedback.save();
    await feedback.populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback',
      error: error.message
    });
  }
};

// Get user's feedback
export const getUserFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const feedback = await Feedback.find({ user: req.user._id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Feedback.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      feedback,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback',
      error: error.message
    });
  }
};

// Get all feedback (Admin)
export const getAllFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, rating } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (rating) query.rating = rating;

    const feedback = await Feedback.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Feedback.countDocuments(query);

    res.json({
      success: true,
      feedback,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback',
      error: error.message
    });
  }
};

// Update feedback
export const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, category, rating, message, isAnonymous } = req.body;

    const feedback = await Feedback.findOne({ _id: id, user: req.user._id });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    feedback.subject = subject || feedback.subject;
    feedback.category = category || feedback.category;
    feedback.rating = rating || feedback.rating;
    feedback.message = message || feedback.message;
    feedback.isAnonymous = isAnonymous !== undefined ? isAnonymous : feedback.isAnonymous;

    await feedback.save();
    await feedback.populate('user', 'name email');

    res.json({
      success: true,
      message: 'Feedback updated successfully',
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating feedback',
      error: error.message
    });
  }
};

// Delete feedback
export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    
    let feedback;
    if (req.user.role === 'admin') {
      feedback = await Feedback.findByIdAndDelete(id);
    } else {
      feedback = await Feedback.findOneAndDelete({ _id: id, user: req.user._id });
    }

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting feedback',
      error: error.message
    });
  }
};

// Get feedback statistics (Admin)
export const getFeedbackStats = async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    const overallStats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        rating: stats,
        category: categoryStats,
        overall: overallStats[0] || { totalFeedback: 0, avgRating: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback statistics',
      error: error.message
    });
  }
};