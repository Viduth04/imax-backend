import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import bcrypt from 'bcryptjs';

// Get all technicians (Admin only)
export const getTechnicians = async (req, res) => {
  try {
    const { status, specialization } = req.query;
    let query = { role: 'technician' };

    if (status) query.status = status;
    if (specialization) query.specialization = specialization;

    const technicians = await User.find(query)
      .select('-password')
      .sort('-createdAt');

    res.json({
      success: true,
      technicians
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single technician
export const getTechnician = async (req, res) => {
  try {
    const technician = await User.findOne({
      _id: req.params.id,
      role: 'technician'
    }).select('-password');

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    res.json({
      success: true,
      technician
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create technician (Admin only)
export const createTechnician = async (req, res) => {
  try {
    const { name, email, password, phone, specialization, experience } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const technician = await User.create({
      name,
      email,
      password,
      phone,
      specialization,
      experience,
      role: 'technician',
      status: 'active'
    });

    const technicianData = await User.findById(technician._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'Technician created successfully',
      technician: technicianData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update technician (Admin or Technician themselves)
export const updateTechnician = async (req, res) => {
  try {
    const technician = await User.findOne({
      _id: req.params.id,
      role: 'technician'
    });

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    // Check if user is admin or updating their own profile
    if (req.user.role !== 'admin' && req.user._id.toString() !== technician._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if email is being changed and if it already exists
    if (req.body.email && req.body.email !== technician.email) {
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // If password is being updated
    if (req.body.password) {
      technician.password = req.body.password;
    }

    // Update other fields
    const allowedFields = ['name', 'email', 'phone', 'address', 'bio', 'specialization', 'experience'];
    if (req.user.role === 'admin') {
      allowedFields.push('status');
    }

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && field !== 'password') {
        technician[field] = req.body[field];
      }
    });

    await technician.save();

    const updatedTechnician = await User.findById(technician._id).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      technician: updatedTechnician
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete technician (Admin only)
export const deleteTechnician = async (req, res) => {
  try {
    const technician = await User.findOne({
      _id: req.params.id,
      role: 'technician'
    });

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Technician deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get technician statistics (Admin)
export const getTechnicianStats = async (req, res) => {
  try {
    const totalTechnicians = await User.countDocuments({ role: 'technician' });
    const activeTechnicians = await User.countDocuments({ role: 'technician', status: 'active' });
    const inactiveTechnicians = await User.countDocuments({ role: 'technician', status: 'inactive' });

    const specializationStats = await User.aggregate([
      { $match: { role: 'technician' } },
      { $group: { _id: '$specialization', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalTechnicians,
        activeTechnicians,
        inactiveTechnicians,
        specializationStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get technician's assigned appointments
export const getMyAppointments = async (req, res) => {
  try {
    const { status } = req.query;
    let query = { technician: req.user._id };

    if (status) query.status = status;

    const appointments = await Appointment.find(query)
      .populate('user', 'name email phone')
      .sort('-appointmentDate');

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update appointment status (Technician)
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if technician is assigned to this appointment
    if (appointment.technician.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    appointment.status = status;
    if (status === 'completed') {
      appointment.completedAt = new Date();
    }
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('user', 'name email phone')
      .populate('technician', 'name email specialization');

    res.json({
      success: true,
      message: 'Appointment status updated',
      appointment: updatedAppointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get technician profile
export const getMyProfile = async (req, res) => {
  try {
    const technician = await User.findById(req.user._id).select('-password');
    res.json({
      success: true,
      technician
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update technician's own password
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const technician = await User.findById(req.user._id);

    const isPasswordValid = await technician.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    technician.password = newPassword;
    await technician.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};