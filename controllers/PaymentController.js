import dotenv from 'dotenv';
dotenv.config();

import Stripe from 'stripe';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY missing. Add it to Backend/.env');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const zeroDecimal = new Set([
  'JPY','KRW','VND','CLP','BIF','DJF','GNF','KMF','MGA','PYG','RWF','UGX','VUV','XAF','XOF','XPF'
]);
const toStripeAmount = (amount, currency) =>
  zeroDecimal.has((currency || '').toUpperCase())
    ? Math.round(amount)
    : Math.round(amount * 100);

// Create / reuse PaymentIntent
export const createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;
    const currency = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }

    let pi;
    if (order.paymentIntentId) {
      pi = await stripe.paymentIntents.retrieve(order.paymentIntentId);
      const desired = toStripeAmount(order.total, currency);
      if (pi.amount !== desired) {
        pi = await stripe.paymentIntents.update(order.paymentIntentId, { amount: desired });
      }
    } else {
      pi = await stripe.paymentIntents.create({
        amount: toStripeAmount(order.total, currency),
        currency,
        metadata: { orderId: order._id.toString(), userId: req.user._id.toString() },
        automatic_payment_methods: { enabled: true },
      });
      order.paymentIntentId = pi.id;
      await order.save();
    }

    return res.json({ success: true, clientSecret: pi.client_secret });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Confirm and mark paid
export const confirmPaymentAndMarkPaid = async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!pi) return res.status(400).json({ success: false, message: 'Invalid PaymentIntent' });

    if (pi.metadata?.orderId !== orderId) {
      return res.status(400).json({ success: false, message: 'PaymentIntent does not match order' });
    }

    if (pi.status === 'succeeded') {
      // decrement stock and clear cart on first successful payment
      if (order.paymentStatus !== 'paid') {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
        }
      }
      order.paymentStatus = 'paid';
      order.status = order.status === 'pending' ? 'processing' : order.status;

      const charge = pi.charges?.data?.[0];
      order.paymentMethodDetails = {
        brand: charge?.payment_method_details?.card?.brand,
        last4: charge?.payment_method_details?.card?.last4,
        expMonth: charge?.payment_method_details?.card?.exp_month,
        expYear: charge?.payment_method_details?.card?.exp_year,
        receiptUrl: charge?.receipt_url,
      };
      order.paidAt = new Date();
      await order.save();

      return res.json({ success: true, message: 'Order marked paid', order });
    }

    if (pi.status === 'requires_payment_method' || pi.status === 'requires_confirmation') {
      return res.status(400).json({ success: false, message: `Payment not completed: ${pi.status}` });
    }

    return res.status(400).json({ success: false, message: `Unhandled status: ${pi.status}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
