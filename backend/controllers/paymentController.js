import express from 'express';
import Stripe from 'stripe';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/payments/create-checkout-session
export const createCheckoutSession = async (req, res) => {
  try {
    const { bookingId } = req.body;
    console.log('createCheckoutSession called with bookingId:', bookingId);
    const booking = await Booking.findById(bookingId).populate('instrument');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (!booking.instrument) {
      return res.status(400).json({ success: false, message: 'Instrument not found for this booking.' });
    }
    if (booking.paymentStatus === 'paid') {
      return res.json({ success: false, message: 'Already paid' });
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'lkr',
            product_data: {
              name: `Instrument rental: ${booking.instrument.brand || ''} ${booking.instrument.model || ''}`,
              description: booking.instrument.description || '',
              images: booking.instrument.image ? [booking.instrument.image] : undefined,
            },
            unit_amount: booking.price * 100, // price in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        bookingId: booking._id.toString(),
      },
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment?success=true&bookingId=${booking._id}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment?canceled=true&bookingId=${booking._id}`,
    });

    // Save session/payment draft
    booking.paymentIntentId = session.payment_intent || null;
    await booking.save();

    try {
      const commission = Math.round(booking.price * 0.10);
      await Payment.findOneAndUpdate(
        { booking: booking._id, user: booking.user },
        {
          booking: booking._id,
          user: booking.user,
          amount: booking.price * 100,
          displayAmount: booking.price,
          currency: 'lkr',
          commission,
          ownerPayout: booking.price - commission,
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent || null,
          status: 'pending',
          rawSession: session,
        },
        { upsert: true, new: true }
      );
    } catch (persistErr) {
      console.error('Failed to persist payment draft:', persistErr);
    }

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('createCheckoutSession error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// (moved imports & stripe init to top)

// POST /api/payments/create-intent
export const createPaymentIntent = async (req, res) => {
  try {
    const { bookingId } = req.body;
    console.log('createPaymentIntent called with bookingId:', bookingId);
    const booking = await Booking.findById(bookingId).populate('instrument');
    console.log('Booking found:', booking);
    if (!booking) {
      console.error('Booking not found for bookingId:', bookingId);
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (booking.paymentStatus === 'paid') {
      console.log('Booking already paid:', bookingId);
      return res.json({ success: false, message: 'Already paid' });
    }

    // Calculate commission and owner payout
    const commission = Math.round(booking.price * 0.10);
    const ownerPayout = booking.price - commission;

    // Create payment intent
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: booking.price * 100, // price in cents
        currency: 'usd',
        metadata: {
          bookingId: booking._id.toString(),
          commission: commission.toString(),
          ownerPayout: ownerPayout.toString(),
        },
        description: `Instrument rental for ${booking.instrument.model}`
      });

      // Save paymentIntentId and commission to booking
      booking.paymentIntentId = paymentIntent.id;
      booking.commission = commission;
      booking.ownerPayout = ownerPayout;
      await booking.save();

      res.json({ success: true, clientSecret: paymentIntent.client_secret });
    } catch (stripeError) {
      console.error('Stripe paymentIntent creation error:', stripeError);
      res.status(500).json({ success: false, message: stripeError.message });
    }
  } catch (error) {
    console.error('createPaymentIntent general error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/payments/mock-success
export const mockPaymentSuccess = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.paymentStatus === 'paid') {
      return res.json({ success: false, message: 'Already marked as paid', booking });
    }
    booking.paymentStatus = 'paid';
    // Leave booking.status unchanged (likely 'pending') to require owner approval
    booking.paidAt = new Date();
    await booking.save();
    // Update or create Payment doc to succeeded
    try {
      await Payment.findOneAndUpdate(
        { booking: booking._id, user: booking.user },
        {
          status: 'succeeded',
          paidAt: new Date(),
        }
      );
    } catch (e) {
      console.error('mockPaymentSuccess Payment update failed:', e.message);
    }
    res.json({ success: true, message: 'Booking marked as paid (mock) awaiting owner approval', booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Stripe webhook endpoint
export const stripeWebhook = express.raw({ type: 'application/json' }, async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingId = session.metadata && session.metadata.bookingId;
    if (bookingId) {
      try {
        const booking = await Booking.findById(bookingId);
        if (booking) {
          booking.paymentStatus = 'paid';
          // Leave status as 'pending' for owner approval
          if (booking.status === 'pending') {
            booking.paidAt = new Date();
          }
          await booking.save();
          await Payment.findOneAndUpdate(
            { booking: booking._id },
            {
              status: 'succeeded',
              paidAt: new Date(),
              stripePaymentIntentId: session.payment_intent || undefined,
            }
          );
          console.log('Booking payment captured; awaiting owner approval:', bookingId);
        } else {
          console.error('Booking not found for webhook bookingId:', bookingId);
        }
      } catch (err) {
        console.error('Error updating booking after payment:', err);
      }
    }
  }
  res.json({ received: true });
});

// GET /api/payments/mine - list current user's payments
export const listMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate({ path: 'booking', populate: { path: 'instrument', select: 'brand model image' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/payments/admin - list all payments (admin only)
export const listAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('user', 'name email')
      .populate({ path: 'booking', populate: { path: 'instrument', select: 'brand model' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
