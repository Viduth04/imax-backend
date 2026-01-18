import mongoose from 'mongoose';

const technicianSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  specialization: {
    type: String,
    required: true,
    enum: ['Hardware Repair', 'Software Issues', 'Network Problems', 'Data Recovery', 'Virus Removal', 'General Maintenance']
  },
  experience: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  avatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const Technician = mongoose.model('Technician', technicianSchema);
export default Technician;