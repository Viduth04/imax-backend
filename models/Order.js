import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: String,
        image: String,
        price: Number,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],

    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },

    // Keep your existing payment methods as-is
    paymentMethod: {
      type: String,
      required: true,
      enum: ['credit-card', 'debit-card', 'paypal', 'cash-on-delivery'], // if you later send 'card', add it here
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },

    // ✅ Stripe-related additions (optional but useful)
    paymentIntentId: { type: String, index: true }, // e.g., 'pi_3...'
    paymentMethodDetails: {
      // stored after success to show in UI / admin
      brand: String, // 'visa', 'mastercard'
      last4: String, // '4242'
      expMonth: Number,
      expYear: Number,
      funding: String, // 'debit' | 'credit'
      wallet: String,  // if paid via wallet (Apple Pay, etc.)
      receiptUrl: String, // Stripe charge receipt URL (if you want to show it)
    },
    paidAt: Date, // set when marking as paid

    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true, default: 0 },
    shippingCost: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },

    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },

    notes: { type: String },

    cancelledAt: Date,
    deliveredAt: Date,
  },
  { timestamps: true }
);

// Generate order number before saving
orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const count = await this.constructor.countDocuments();
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000);
      this.orderNumber = `ORD-${timestamp}-${count + 1}-${randomNum}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Small convenience helper (optional)
orderSchema.methods.markPaid = async function (details = {}) {
  if (this.paymentStatus !== 'paid') {
    this.paymentStatus = 'paid';
    this.status = this.status === 'pending' ? 'processing' : this.status;
    this.paidAt = new Date();
    this.paymentMethodDetails = { ...(this.paymentMethodDetails || {}), ...details };
    await this.save();
  }
  return this;
};

const Order = mongoose.model('Order', orderSchema);
export default Order;
