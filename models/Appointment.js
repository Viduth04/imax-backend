import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentNumber: {
    type: String,
    unique: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true,
    enum: ['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00']
  },
  issueType: {
    type: String,
    required: true,
    enum: ['Hardware Repair', 'Software Issues', 'Network Problems', 'Data Recovery', 'Virus Removal', 'General Maintenance', 'Other']
  },
  issueDescription: {
    type: String,
    required: true
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  cancelledAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Generate appointment number before saving
appointmentSchema.pre('save', async function(next) {
  if (this.isNew && !this.appointmentNumber) {
    try {
      const count = await this.constructor.countDocuments();
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000);
      this.appointmentNumber = `APT-${timestamp}-${count + 1}-${randomNum}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;