import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling', 'Peripherals', 'Accessories']
  },
  brand: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  images: [{
    type: String,
    required: true
  }],
  specifications: {
    type: Map,
    of: String
  },
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out-of-stock'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Update status based on quantity
productSchema.pre('save', function(next) {
  if (this.quantity === 0) {
    this.status = 'out-of-stock';
  } else if (this.status === 'out-of-stock' && this.quantity > 0) {
    this.status = 'active';
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;