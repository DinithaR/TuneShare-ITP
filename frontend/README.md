# TuneShare Frontend

This is the React + Vite frontend for the TuneShare instrument rental platform.

## Key Features
- Browse instruments and view details
- Create and manage bookings
- Stripe Checkout payment integration (LKR)
- 10% platform commission, payout calculated for owner
- Webhook-based payment confirmation
- Post-payment cancel allowed until owner confirms
- Admin dashboard & payments listing

## Payment & Approval Flow
1. User creates a booking (status: `pending`, paymentStatus: `pending`).
2. User clicks "Pay Now" → backend creates Stripe Checkout Session → redirects to Stripe.
3. On success, Stripe redirects to `/payment?success=true&bookingId=...`.
4. Stripe sends `checkout.session.completed` webhook → backend marks booking `paymentStatus='paid'` and leaves `status='pending'` (no auto-confirm).
5. Booking now displays as "awaiting-approval" (paid but still pending). User may still cancel until owner confirms.
6. Owner reviews bookings in their dashboard and explicitly sets status to `confirmed` (safeguard prevents confirming if payment not yet completed) or `cancelled`.
7. Once confirmed, user can no longer cancel.

## New Backend Payment Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/create-checkout-session` | Create Stripe Checkout session for a booking |
| POST | `/api/payments/create-intent` | (Legacy) Create PaymentIntent (unused now) |
| POST | `/api/payments/mock-success` | Mark booking as paid (testing) |
| POST | `/api/payments/webhook` | Stripe webhook receiver (raw body) |
| GET | `/api/payments/mine` | List current user's payment records |
| GET | `/api/payments/admin` | List all payments (admin only) |

## Data Models (Relevant)
### Booking (added fields)
```
paymentStatus: 'pending' | 'paid'
paymentIntentId: String
commission: Number
ownerPayout: Number
paidAt: Date
```
### Payment
```
booking, user, amount (cents), displayAmount, currency,
commission, ownerPayout, stripeSessionId, stripePaymentIntentId,
status: 'pending' | 'succeeded' | 'failed', paidAt, rawSession
```

## Admin Payments Page
Route: `/admin/payments` (requires user role = `admin`).
Shows table of all platform transactions.

## Environment Variables (Backend)
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FRONTEND_URL=http://localhost:5173
```

## Frontend Env
```
VITE_API_BASE= (if using proxy / optional)
VITE_CURRENCY=LKR
```

## Future Enhancements
- Refund / cancellation window logic
- Payout scheduling and ledger
- Filtering & export for payments
- Email / notification on payment & approval

## Development
Run frontend:
```
npm run dev
```
Run backend (from backend folder):
```
npm run server
```

Stripe webhook forwarding (local):
```
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Enjoy building with TuneShare!
