import express from 'express';
import { createPaymentIntent, mockPaymentSuccess, createCheckoutSession, stripeWebhook, listMyPayments, listAllPayments } from '../controllers/paymentController.js';
import { protect, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/create-intent', protect, createPaymentIntent);
router.post('/create-checkout-session', protect, createCheckoutSession);
router.post('/mock-success', protect, mockPaymentSuccess);
router.get('/mine', protect, listMyPayments);
router.get('/admin', protect, isAdmin, listAllPayments);

// Stripe webhook endpoint (no auth middleware!)
router.post('/webhook', stripeWebhook);

export default router;
