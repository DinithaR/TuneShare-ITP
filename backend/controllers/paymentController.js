import express from 'express';
import Stripe from 'stripe';
import PDFDocument from 'pdfkit';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/payments/create-checkout-session
export const createCheckoutSession = async (req, res) => {
  try {
    const { bookingId } = req.body;
    console.log('createCheckoutSession called with bookingId:', bookingId);
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Stripe secret key missing in environment.');
      return res.status(500).json({ success: false, code: 'STRIPE_KEY_MISSING', message: 'Payment configuration error. Contact support.' });
    }
    if (!bookingId) {
      return res.status(400).json({ success: false, code: 'NO_BOOKING_ID', message: 'Booking ID is required.' });
    }
    const booking = await Booking.findById(bookingId).populate('instrument');
    if (!booking) {
      return res.status(404).json({ success: false, code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    }
    if (!booking.instrument) {
      return res.status(400).json({ success: false, code: 'INSTRUMENT_NOT_FOUND', message: 'Instrument not found for this booking.' });
    }
    if (booking.paymentStatus === 'paid') {
      return res.json({ success: false, code: 'ALREADY_PAID', message: 'Already paid' });
    }
    if (!booking.price || booking.price <= 0) {
      console.error('Invalid booking price for booking', bookingId, 'price:', booking.price);
      return res.status(400).json({ success: false, code: 'INVALID_PRICE', message: 'Invalid booking price.' });
    }

    const currency = (process.env.STRIPE_CURRENCY || 'lkr').toLowerCase();
    if (!/^[a-z]{3}$/.test(currency)) {
      return res.status(500).json({ success: false, code: 'INVALID_CURRENCY', message: 'Configured currency invalid.' });
    }

    // Create Stripe Checkout session
    let session;
    try {
      session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
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
    } catch (stripeErr) {
      console.error('Stripe session creation failed:', stripeErr?.message, stripeErr?.code);
      return res.status(500).json({ success: false, code: stripeErr?.code || 'STRIPE_SESSION_ERROR', message: stripeErr?.message || 'Payment session creation failed.' });
    }

  // Save session/payment draft
  booking.paymentIntentId = session.payment_intent || null;
  booking.stripeSessionId = session.id;
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

    if (!session?.url) {
      console.error('Stripe session created but no URL returned. Session:', session?.id);
      return res.status(500).json({ success: false, code: 'NO_SESSION_URL', message: 'Payment session not available.' });
    }
    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('createCheckoutSession error:', error);
    res.status(500).json({ success: false, code: 'UNEXPECTED', message: error.message || 'Unexpected error' });
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

// Stripe webhook endpoint (raw body applied at app level)
export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log('[Stripe Webhook] Received event:', event.type, 'id:', event.id);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('[Stripe Webhook] checkout.session.completed session.id:', session.id, 'payment_intent:', session.payment_intent);
    const bookingId = session.metadata && session.metadata.bookingId;
    console.log('[Stripe Webhook] Extracted bookingId:', bookingId);
    if (bookingId) {
      try {
        const booking = await Booking.findById(bookingId);
        if (booking) {
          booking.paymentStatus = 'paid';
          // Leave status as 'pending' for owner approval
          if (booking.status === 'pending') {
            booking.paidAt = new Date();
          }
          booking.lastWebhookEventId = event.id;
            booking.lastWebhookAt = new Date();
          await booking.save();
          console.log('[Stripe Webhook] Booking updated paymentStatus=paid, paidAt set? ', !!booking.paidAt);
          await Payment.findOneAndUpdate(
            { booking: booking._id },
            {
              status: 'succeeded',
              paidAt: new Date(),
              stripePaymentIntentId: session.payment_intent || undefined,
            }
          );
          console.log('Booking payment captured; awaiting owner approval:', bookingId);
          if (process.env.STORE_WEBHOOK_EVENT_LOG === 'true') {
            console.log('[Stripe Webhook] Event dump (truncated):', JSON.stringify({
              id: event.id,
              type: event.type,
              created: event.created,
              livemode: event.livemode
            }));
          }
        } else {
          console.error('Booking not found for webhook bookingId:', bookingId);
        }
      } catch (err) {
        console.error('Error updating booking after payment:', err);
      }
    }
  }
  res.json({ received: true });
};

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

// GET /api/payments/debug/:bookingId (admin) - raw booking + payment state
export const debugPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });
    const booking = await Booking.findById(bookingId).lean();
    const payment = await Payment.findOne({ booking: bookingId }).lean();
    res.json({ success: true, booking, payment, env: {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      frontendUrl: process.env.FRONTEND_URL
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/payments/sync/:bookingId - reconcile payment if webhook missed
export const syncPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    // Authorization: only booking user, owner, or admin
    const requester = req.user;
    if (requester.role !== 'admin' && requester._id.toString() !== booking.user.toString() && requester._id.toString() !== booking.owner.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (booking.paymentStatus === 'paid') {
      return res.json({ success: true, booking, message: 'Already marked paid' });
    }
    if (!booking.stripeSessionId) {
      return res.status(400).json({ success: false, message: 'No Stripe session recorded for this booking.' });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ success: false, message: 'Stripe not configured' });
    }
    // Retrieve session from Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId);
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to retrieve Stripe session', error: e.message });
    }
    const paymentStatus = session.payment_status; // can be paid / unpaid
    if (paymentStatus === 'paid') {
      booking.paymentStatus = 'paid';
      if (booking.status === 'pending') booking.paidAt = new Date();
      booking.lastWebhookEventId = booking.lastWebhookEventId || `manual-sync-${Date.now()}`;
      booking.lastWebhookAt = new Date();
      await booking.save();
      await Payment.findOneAndUpdate(
        { booking: booking._id },
        { status: 'succeeded', paidAt: new Date(), stripePaymentIntentId: session.payment_intent || undefined },
        { new: true }
      );
      return res.json({ success: true, booking, message: 'Payment reconciled from Stripe session.' });
    }
    return res.json({ success: false, message: 'Stripe session not paid yet', sessionStatus: paymentStatus, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/payments/report/:paymentId (admin) - download a PDF report for a payment
export const downloadPaymentReport = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) return res.status(400).json({ success: false, message: 'paymentId required' });
    const payment = await Payment.findById(paymentId)
      .populate('user', 'name email')
      .populate({ path: 'booking', populate: { path: 'instrument', select: 'brand model location' } });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    // Prepare PDF
    const doc = new PDFDocument({ margin: 50 });
    const filename = `payment_${payment._id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF stream
    doc.pipe(res);

    // Header
    doc
      .fontSize(18)
      .fillColor('#111')
      .text('TuneShare - Payment Report', { align: 'left' })
      .moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor('#666')
      .text(`Generated: ${new Date().toLocaleString()}`)
      .moveDown(1);

    // Payment summary
    const booking = payment.booking;
    const instrument = booking?.instrument;
    const user = payment.user;
    const currency = (payment.currency || 'LKR').toUpperCase();

    const row = (label, value) => {
      doc.font('Helvetica-Bold').fillColor('#333').text(label, { continued: true });
      doc.font('Helvetica').fillColor('#000').text(` ${value}`);
    };

    doc.fontSize(14).fillColor('#222').text('Payment Details').moveDown(0.5);
    row('Payment ID:', payment._id.toString());
    if (booking) row('Booking ID:', booking._id.toString());
    row('Status:', payment.status || '');
    row('Amount:', `${currency} ${payment.displayAmount ?? Math.round((payment.amount || 0) / 100)}`);
    if (typeof payment.commission === 'number') row('Commission:', `${currency} ${payment.commission}`);
    if (typeof payment.ownerPayout === 'number') row('Owner Payout:', `${currency} ${payment.ownerPayout}`);
    if (payment.paidAt) row('Paid At:', new Date(payment.paidAt).toLocaleString());
    row('Created:', new Date(payment.createdAt).toLocaleString());
    doc.moveDown(1);

    // Parties
    doc.fontSize(14).fillColor('#222').text('Parties').moveDown(0.5);
    if (user) {
      row('Customer:', user.name || '');
      if (user.email) row('Email:', user.email);
    }
    if (instrument) {
      row('Instrument:', `${instrument.brand || ''} ${instrument.model || ''}`.trim());
      if (instrument.location) row('Location:', instrument.location);
    }
    doc.moveDown(1);

    // Stripe references
    doc.fontSize(14).fillColor('#222').text('Stripe References').moveDown(0.5);
    if (payment.stripeSessionId) row('Checkout Session:', payment.stripeSessionId);
    if (payment.stripePaymentIntentId) row('Payment Intent:', payment.stripePaymentIntentId);
    if (booking?.stripeSessionId && booking.stripeSessionId !== payment.stripeSessionId) row('Booking Session:', booking.stripeSessionId);
    doc.moveDown(1);

    doc.fontSize(10).fillColor('#666').text('This report is automatically generated by TuneShare.', { align: 'center' });
    doc.end();
  } catch (err) {
    console.error('downloadPaymentReport error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};
