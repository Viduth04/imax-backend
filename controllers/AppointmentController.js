import Appointment from '../models/Appointment.js';
import User from '../models/User.js';

// Check availability for a time slot
export const checkAvailability = async (req, res) => {
  try {
    const { date, timeSlot, excludeAppointmentId } = req.query;

    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if date is at least 2 days from now
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    if (appointmentDate < twoDaysFromNow) {
      return res.json({
        success: true,
        available: false,
        message: 'Appointments must be scheduled at least 2 days in advance'
      });
    }

    // Create date range for the specific day
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      timeSlot,
      status: { $nin: ['cancelled', 'completed'] }
    };

    // Exclude current appointment when updating
    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }

    const existingAppointment = await Appointment.findOne(query);

    res.json({
      success: true,
      available: !existingAppointment,
      message: existingAppointment ? 'This time slot is already booked' : 'Time slot is available'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create appointment (User)
export const createAppointment = async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, appointmentDate, timeSlot, issueType, issueDescription } = req.body;

    // Validate appointment date (must be at least 2 days from now)
    const date = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    if (date < twoDaysFromNow) {
      return res.status(400).json({
        success: false,
        message: 'Appointments must be scheduled at least 2 days in advance'
      });
    }

    // Check if time slot is available
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointment = await Appointment.findOne({
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      timeSlot,
      status: { $nin: ['cancelled', 'completed'] }
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }

    const appointment = await Appointment.create({
      user: req.user._id,
      customerName,
      customerEmail,
      customerPhone,
      appointmentDate: date,
      timeSlot,
      issueType,
      issueDescription
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('user', 'name email')
      .populate('technician', 'name email phone specialization experience');

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      appointment: populatedAppointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get user appointments
export const getUserAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user._id })
      .populate('technician', 'name email phone specialization experience')
      .sort('-createdAt');

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

// Get all appointments (Admin)
export const getAllAppointments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = {};
    if (status) query.status = status;

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate('user', 'name email')
      .populate('technician', 'name email phone specialization experience status')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single appointment
export const getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('user', 'name email')
      .populate('technician', 'name email phone specialization experience status');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if user owns the appointment or is admin or is assigned technician
    const isOwner = appointment.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isTechnician = req.user.role === 'technician' && 
                        appointment.technician && 
                        appointment.technician._id.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isTechnician) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update appointment (User - before appointment date)
export const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check ownership
    if (appointment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if appointment can be updated
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot update ${appointment.status} appointment`
      });
    }

    // If updating date or time, check availability
    if (req.body.appointmentDate || req.body.timeSlot) {
      const newDate = req.body.appointmentDate ? new Date(req.body.appointmentDate) : appointment.appointmentDate;
      const newTimeSlot = req.body.timeSlot || appointment.timeSlot;

      // Validate new date (must be at least 2 days from now)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const twoDaysFromNow = new Date(today);
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      if (newDate < twoDaysFromNow) {
        return res.status(400).json({
          success: false,
          message: 'Appointments must be scheduled at least 2 days in advance'
        });
      }

      // Check availability
      const startOfDay = new Date(newDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(newDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointment = await Appointment.findOne({
        _id: { $ne: appointment._id },
        appointmentDate: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        timeSlot: newTimeSlot,
        status: { $nin: ['cancelled', 'completed'] }
      });

      if (existingAppointment) {
        return res.status(400).json({
          success: false,
          message: 'This time slot is already booked'
        });
      }
    }

    Object.assign(appointment, req.body);
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('user', 'name email')
      .populate('technician', 'name email phone specialization experience');

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Assign technician to appointment (Admin)
export const assignTechnician = async (req, res) => {
  try {
    const { technicianId } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if the user is a technician
    const technician = await User.findOne({ 
      _id: technicianId, 
      role: 'technician' 
    });

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    // Check if technician is active and not pending deletion
    if (technician.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Technician is not active'
      });
    }

    appointment.technician = technicianId;
    if (appointment.status === 'pending') {
      appointment.status = 'confirmed';
    }
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('user', 'name email')
      .populate('technician', 'name email phone specialization experience status');

    res.json({
      success: true,
      message: 'Technician assigned successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update appointment status (Admin)
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    appointment.status = status;
    if (status === 'completed') {
      appointment.completedAt = new Date();
    }
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('user', 'name email')
      .populate('technician', 'name email phone specialization experience');

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

// Cancel appointment (User - at least 1 day before)
export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check ownership
    if (appointment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if already cancelled or completed
    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already cancelled'
      });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed appointment'
      });
    }

    // Check if appointment is at least 1 day away
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const appointmentDate = new Date(appointment.appointmentDate);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate <= oneDayFromNow) {
      return res.status(400).json({
        success: false,
        message: 'Appointments can only be cancelled at least 1 day before the scheduled date'
      });
    }

    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('user', 'name email')
      .populate('technician', 'name email phone specialization experience');

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete appointment (Admin)
export const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get appointment statistics (Admin)
export const getAppointmentStats = async (req, res) => {
  try {
    const totalAppointments = await Appointment.countDocuments();
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
    const confirmedAppointments = await Appointment.countDocuments({ status: 'confirmed' });
    const inProgressAppointments = await Appointment.countDocuments({ status: 'in-progress' });
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    const cancelledAppointments = await Appointment.countDocuments({ status: 'cancelled' });

    const issueTypeStats = await Appointment.aggregate([
      { $group: { _id: '$issueType', count: { $sum: 1 } } }
    ]);

    // Get technician performance stats
    const technicianStats = await Appointment.aggregate([
      {
        $match: { technician: { $ne: null } }
      },
      {
        $group: {
          _id: '$technician',
          totalAssigned: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'technicianInfo'
        }
      },
      {
        $unwind: '$technicianInfo'
      },
      {
        $project: {
          technician: {
            _id: '$technicianInfo._id',
            name: '$technicianInfo.name',
            email: '$technicianInfo.email',
            specialization: '$technicianInfo.specialization'
          },
          totalAssigned: 1,
          completed: 1,
          inProgress: 1
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalAppointments,
        pendingAppointments,
        confirmedAppointments,
        inProgressAppointments,
        completedAppointments,
        cancelledAppointments,
        issueTypeStats,
        technicianStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get available technicians for assignment (Admin)
export const getAvailableTechnicians = async (req, res) => {
  try {
    const { specialization } = req.query;
    
    let query = { 
      role: 'technician', 
      status: 'active' 
    };

    if (specialization) {
      query.specialization = specialization;
    }

    const technicians = await User.find(query)
      .select('name email phone specialization experience')
      .sort('name');

    // Get appointment count for each technician
    const techniciansWithStats = await Promise.all(
      technicians.map(async (tech) => {
        const appointmentCount = await Appointment.countDocuments({
          technician: tech._id,
          status: { $in: ['confirmed', 'in-progress'] }
        });

        return {
          ...tech.toObject(),
          activeAppointments: appointmentCount
        };
      })
    );

    res.json({
      success: true,
      technicians: techniciansWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get technician's workload (Admin)
export const getTechnicianWorkload = async (req, res) => {
  try {
    const { technicianId } = req.params;

    // Verify technician exists and is a technician
    const technician = await User.findOne({
      _id: technicianId,
      role: 'technician'
    }).select('name email specialization experience status');

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    // Get appointments grouped by status
    const appointments = await Appointment.find({ technician: technicianId })
      .populate('user', 'name email')
      .sort('-appointmentDate');

    const stats = {
      total: appointments.length,
      pending: appointments.filter(a => a.status === 'confirmed').length,
      inProgress: appointments.filter(a => a.status === 'in-progress').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length
    };

    res.json({
      success: true,
      technician,
      appointments,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};