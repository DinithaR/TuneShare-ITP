import express from 'express';
import Stripe from 'stripe';
import PDFDocument from 'pdfkit';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/payments/create-checkout-session
export const createCheckoutSession = async (req, res) => {
  try {
    const { bookingId, billingInfo } = req.body;
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
        paymentType: 'rental',
        fullName: billingInfo?.fullName || '',
        nic: billingInfo?.nic || '',
        phone: billingInfo?.phone || '',
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
        { booking: booking._id, user: booking.user, type: 'rental' },
        {
          booking: booking._id,
          user: booking.user,
          type: 'rental',
          amount: booking.price * 100,
          displayAmount: booking.price,
          currency: 'lkr',
          commission,
          ownerPayout: booking.price - commission,
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent || null,
          status: 'pending',
          rawSession: session,
          billingInfo: billingInfo ? {
            fullName: billingInfo.fullName,
            nic: billingInfo.nic,
            address: billingInfo.address,
            phone: billingInfo.phone,
            termsAcceptedAt: billingInfo.termsAcceptedAt ? new Date(billingInfo.termsAcceptedAt) : new Date(),
          } : undefined,
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
  const paymentType = session.metadata && session.metadata.paymentType; // 'rental' or 'late_fee'
    console.log('[Stripe Webhook] Extracted bookingId:', bookingId);
    if (bookingId) {
      try {
        const booking = await Booking.findById(bookingId);
        if (booking) {
          if (paymentType === 'late_fee') {
            // Mark late fee paid only
            booking.lateFeePaid = true;
            booking.lateFeePaidAt = new Date();
          } else {
            // Initial rental payment
            booking.paymentStatus = 'paid';
            // Leave status as 'pending' for owner approval
            if (booking.status === 'pending') {
              booking.paidAt = new Date();
            }
          }
          booking.lastWebhookEventId = event.id;
            booking.lastWebhookAt = new Date();
          await booking.save();
          console.log('[Stripe Webhook] checkout completed for type=', paymentType || 'rental');
          await Payment.findOneAndUpdate(
            { booking: booking._id, type: paymentType === 'late_fee' ? 'late_fee' : 'rental' },
            { status: 'succeeded', paidAt: new Date(), stripePaymentIntentId: session.payment_intent || undefined }
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

// POST /api/payments/create-late-fee-session
export const createLateFeeCheckoutSession = async (req, res) => {
  try {
    const { bookingId, billingInfo } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });
    const booking = await Booking.findById(bookingId).populate('instrument');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (!booking.returnConfirmedAt) {
      return res.status(400).json({ success: false, message: 'Return is not marked yet; no late fee to pay.' });
    }
    if (!booking.lateFee || booking.lateFee <= 0) {
      return res.status(400).json({ success: false, message: 'No late fee due for this booking' });
    }
    if (booking.lateFeePaid) {
      return res.status(400).json({ success: false, message: 'Late fee already paid' });
    }
    const currency = (process.env.STRIPE_CURRENCY || 'lkr').toLowerCase();
    const amount = booking.lateFee; // display currency amount
    let session;
    try {
  session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Late return fee: ${booking.instrument?.brand || ''} ${booking.instrument?.model || ''}`.trim(),
              description: `Late by ${booking.lateDays} day(s)`,
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        bookingId: booking._id.toString(),
        paymentType: 'late_fee',
        fullName: billingInfo?.fullName || '',
        nic: billingInfo?.nic || '',
        phone: billingInfo?.phone || '',
      },
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment?success=true&bookingId=${booking._id}&lateFee=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment?canceled=true&bookingId=${booking._id}&lateFee=true`,
      });
    } catch (stripeErr) {
      console.error('Stripe late fee session error:', stripeErr?.message || stripeErr);
      return res.status(500).json({ success: false, message: stripeErr?.message || 'Stripe session error' });
    }

    // Upsert Payment doc for late fee
    const commission = Math.round(amount * 0.10);
    await Payment.findOneAndUpdate(
      { booking: booking._id, user: booking.user, type: 'late_fee' },
      {
        booking: booking._id,
        user: booking.user,
        type: 'late_fee',
        amount: amount * 100,
        displayAmount: amount,
        currency,
        commission,
        ownerPayout: amount - commission,
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent || null,
        status: 'pending',
        rawSession: session,
        billingInfo: billingInfo ? {
          fullName: billingInfo.fullName,
          nic: billingInfo.nic,
          address: billingInfo.address,
          phone: billingInfo.phone,
          termsAcceptedAt: billingInfo.termsAcceptedAt ? new Date(billingInfo.termsAcceptedAt) : new Date(),
        } : undefined,
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, url: session.url });
  } catch (err) {
    console.error('createLateFeeCheckoutSession error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create late fee session' });
  }
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

// GET /api/payments/for-booking/:bookingId - fetch current user's payment for a booking
export const getPaymentForBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });
    const payment = await Payment.findOne({ booking: bookingId, user: req.user._id })
      .populate({ path: 'booking', populate: { path: 'instrument', select: 'brand model image location' } })
      .lean();
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found for this booking' });
    return res.json({ success: true, payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/payments/receipt/:paymentId - download PDF receipt for the logged-in user
export const downloadUserReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) return res.status(400).json({ success: false, message: 'paymentId required' });
    const payment = await Payment.findById(paymentId)
      .populate('user', 'name email')
      .populate({ path: 'booking', populate: { path: 'instrument', select: 'brand model location' } });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    // Authorization: payment must belong to the requesting user
    if (payment.user?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Generate a polished, branded PDF receipt
    const doc = new PDFDocument({ margin: 50 });
    const filename = `receipt_${payment._id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // Helper utilities
  const ACCENT = '#ec4899'; // Tailwind pink-500 to match brand
  const BORDER = '#e5e7eb'; // gray-200
  const MUTED = '#6b7280'; // gray-500
  const DARK = '#111827';  // gray-900
  const LIGHT_BG = '#f9fafb';

  // Layout metrics
  const MARGIN = 50;
  const LEFT = MARGIN;
  const RIGHT = doc.page.width - MARGIN;
  const CONTENT_W = RIGHT - LEFT;

    const toCurrency = (val, curr) => {
      const code = (curr || payment.currency || 'LKR').toUpperCase();
      // Prefer generic formatting to avoid locale issues on server
      return `${code} ${Number(val || 0).toFixed(2)}`;
    };

    const safeText = (t) => (t == null ? '' : String(t));

  const yStart = doc.y;

  // Header bar
  doc.save();
  doc.rect(LEFT, 40, CONTENT_W, 60).fill(ACCENT);
    doc.restore();

    // Brand/Title over the bar
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('TuneShare', LEFT + 10, 55, { continued: true });
    doc.font('Helvetica').text(' • Payment Receipt');

    // Receipt meta box
    const metaTop = 110;
  doc.roundedRect(LEFT, metaTop, CONTENT_W, 70, 6).strokeColor(BORDER).lineWidth(1).stroke();
  const META_PAD = 15;
  const META_COL_W = CONTENT_W / 3;
  const metaX0 = LEFT + META_PAD;
  const metaX1 = LEFT + META_PAD + META_COL_W;
  const metaX2 = LEFT + META_PAD + META_COL_W * 2;
  const metaW = META_COL_W - META_PAD * 1.5;
  doc.fontSize(10).fillColor(MUTED).text('Receipt No.', metaX0, metaTop + 12, { width: metaW });
  doc.fontSize(12).fillColor(DARK).text(payment._id.toString(), metaX0, metaTop + 26, { width: metaW });
  doc.fontSize(10).fillColor(MUTED).text('Date', metaX1, metaTop + 12, { width: metaW });
  doc.fontSize(12).fillColor(DARK).text(new Date(payment.paidAt || payment.createdAt).toLocaleString(), metaX1, metaTop + 26, { width: metaW });
  doc.fontSize(10).fillColor(MUTED).text('Status', metaX2, metaTop + 12, { width: metaW });
    const statusText = (payment.status || '').toUpperCase();
  doc.fontSize(12).fillColor(statusText === 'SUCCEEDED' ? '#059669' : '#dc2626').text(statusText || '—', metaX2, metaTop + 26, { width: metaW });

    // PAID watermark if succeeded
    if (payment.status === 'succeeded') {
      doc.save().rotate(30, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.font('Helvetica-Bold').fontSize(80).fillColor('#059669').opacity(0.08).text('PAID', 100, doc.page.height / 2 - 40);
      doc.restore().opacity(1);
    }

    // Parties / Customer block
  const blockTop = metaTop + 90;
  const leftColX = LEFT;
  const rightColX = LEFT + CONTENT_W / 2 + 10;
  const rightColW = RIGHT - rightColX;
  doc.fontSize(12).fillColor(DARK).text('Billed To', leftColX, blockTop);
  doc.fontSize(10).fillColor(MUTED).text('Name', leftColX, blockTop + 18);
  doc.fontSize(12).fillColor(DARK).text(safeText(payment.user?.name) || '—', leftColX, blockTop + 32, { width: CONTENT_W / 2 - 20 });
  doc.fontSize(10).fillColor(MUTED).text('Email', leftColX, blockTop + 52);
  doc.fontSize(12).fillColor(DARK).text(safeText(payment.user?.email) || '—', leftColX, blockTop + 66, { width: CONTENT_W / 2 - 20 });

    // Booking Summary
    const booking = payment.booking;
    const instrument = booking?.instrument;
  doc.fontSize(12).fillColor(DARK).text('Booking Summary', rightColX, blockTop, { width: rightColW });
    const pickup = booking?.pickupDate ? new Date(booking.pickupDate) : null;
    const ret = booking?.returnDate ? new Date(booking.returnDate) : null;
    const msInDay = 24 * 60 * 60 * 1000;
    const daysRaw = pickup && ret ? Math.ceil((ret - pickup) / msInDay) : 1;
    const days = Math.max(1, daysRaw || 1);

  doc.fontSize(10).fillColor(MUTED).text('Booking ID', rightColX, blockTop + 18, { width: rightColW });
  doc.fontSize(12).fillColor(DARK).text(booking?._id?.toString() || '—', rightColX, blockTop + 32, { width: rightColW });
  doc.fontSize(10).fillColor(MUTED).text('Instrument', rightColX, blockTop + 52, { width: rightColW });
  doc.fontSize(12).fillColor(DARK).text(`${safeText(instrument?.brand)} ${safeText(instrument?.model)}`.trim() || '—', rightColX, blockTop + 66, { width: rightColW });
  doc.fontSize(10).fillColor(MUTED).text('Location', rightColX, blockTop + 86, { width: rightColW });
  doc.fontSize(12).fillColor(DARK).text(safeText(instrument?.location) || '—', rightColX, blockTop + 100, { width: rightColW });
  doc.fontSize(10).fillColor(MUTED).text('Rental Period', rightColX, blockTop + 120, { width: rightColW });
    const periodStr = pickup && ret ? `${pickup.toISOString().slice(0,10)} → ${ret.toISOString().slice(0,10)} (${days} day${days>1 ? 's' : ''})` : '—';
  doc.fontSize(12).fillColor(DARK).text(periodStr, rightColX, blockTop + 134, { width: rightColW });

    // Charges Table
  const tableTop = blockTop + 170;
  const tableX = LEFT;
  const tableW = CONTENT_W;
  const rowH = 26;
  const PAD = 12;
  // Proportional column widths
  const descW = Math.round(tableW * 0.52);
  const qtyW = Math.round(tableW * 0.14);
  const unitW = Math.round(tableW * 0.16);
  const amtW = tableW - descW - qtyW - unitW; // ensure fit
  const xDesc = tableX;
  const xQty = xDesc + descW;
  const xUnit = xQty + qtyW;
  const xAmt = xUnit + unitW;

  // Header background
  doc.save();
  doc.rect(tableX, tableTop, tableW, rowH).fill(LIGHT_BG);
  doc.restore();
  doc.strokeColor(BORDER).lineWidth(1).rect(tableX, tableTop, tableW, rowH).stroke();
  doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold');
  doc.text('Description', xDesc + PAD, tableTop + 7, { width: descW - PAD * 2 });
  doc.text('Qty/Days', xQty, tableTop + 7, { width: qtyW - PAD, align: 'right' });
  doc.text('Unit Price', xUnit, tableTop + 7, { width: unitW - PAD, align: 'right' });
  doc.text('Amount', xAmt, tableTop + 7, { width: amtW - PAD, align: 'right' });

    const amountDisplay = typeof payment.displayAmount === 'number'
      ? payment.displayAmount
      : Math.round((payment.amount || 0) / 100);
    const unitPrice = days > 0 ? (amountDisplay / days) : amountDisplay;

    // Row: Rental Fee
  const r1Top = tableTop + rowH;
  doc.strokeColor(BORDER).lineWidth(1).rect(tableX, r1Top, tableW, rowH).stroke();
  doc.font('Helvetica').fillColor(DARK).fontSize(11);
  doc.text(`Instrument Rental - ${safeText(instrument?.brand)} ${safeText(instrument?.model)}`.trim(), xDesc + PAD, r1Top + 7, { width: descW - PAD * 2 });
  doc.text(String(days), xQty, r1Top + 7, { width: qtyW - PAD, align: 'right' });
  doc.text(toCurrency(unitPrice, payment.currency), xUnit, r1Top + 7, { width: unitW - PAD, align: 'right' });
  doc.text(toCurrency(amountDisplay, payment.currency), xAmt, r1Top + 7, { width: amtW - PAD, align: 'right' });

    // Totals area
    const totalsTop = r1Top + rowH + 10;
    const labelW = 120;
    const valueW = 120;
    const totalsX = tableX + tableW - (labelW + valueW + 10);
    const drawTotalRow = (label, value, y, bold = false) => {
      doc.fontSize(11).fillColor(MUTED).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(label, totalsX, y, { width: labelW, align: 'right' });
      doc.fontSize(12).fillColor(DARK).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(value, totalsX + labelW + 10, y - 1, { width: valueW, align: 'right' });
    };

    drawTotalRow('Subtotal', toCurrency(amountDisplay, payment.currency), totalsTop);
    if (typeof payment.commission === 'number') {
      drawTotalRow('Platform Fee', toCurrency(payment.commission, payment.currency), totalsTop + 18);
    }
    const totalPaid = amountDisplay; // represents customer paid amount
    drawTotalRow('Total Paid', toCurrency(totalPaid, payment.currency), totalsTop + 36, true);

    // References
  const refTop = totalsTop + 70;
  doc.fontSize(12).fillColor(DARK).font('Helvetica-Bold').text('Payment References', LEFT, refTop, { width: CONTENT_W });
  doc.fontSize(10).fillColor(MUTED).font('Helvetica').text('Checkout Session', LEFT, refTop + 18, { width: CONTENT_W });
  doc.fontSize(11).fillColor(DARK).text(payment.stripeSessionId || '—', LEFT, refTop + 32, { width: CONTENT_W });
  doc.fontSize(10).fillColor(MUTED).text('Payment Intent', LEFT, refTop + 52, { width: CONTENT_W });
  doc.fontSize(11).fillColor(DARK).text(payment.stripePaymentIntentId || '—', LEFT, refTop + 66, { width: CONTENT_W });

    // Perforation-style separator and footer note
  const sepY = refTop + 95;
  doc.save();
  doc.strokeColor(BORDER).lineWidth(1).dash(3, { space: 2 });
  doc.moveTo(LEFT, sepY).lineTo(RIGHT, sepY).stroke();
    doc.undash();
    doc.restore();

  doc.fontSize(10).fillColor(MUTED).text('Thank you for your payment. This receipt serves as proof of payment for the booking listed above.', LEFT, sepY + 12, { align: 'center', width: CONTENT_W });

    doc.end();
  } catch (err) {
    console.error('downloadUserReceipt error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate receipt' });
  }
};
