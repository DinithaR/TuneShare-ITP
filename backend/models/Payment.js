import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const paymentSchema = new Schema({
  booking: { type: Types.ObjectId, ref: 'Booking', required: true, index: true },
  user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  // type of payment: initial rental payment or late fee
  type: { type: String, enum: ['rental', 'late_fee'], default: 'rental', index: true },
  amount: { type: Number, required: true }, // in smallest currency unit (cents)
  displayAmount: { type: Number, required: true }, // original amount (e.g., LKR without *100)
  currency: { type: String, default: 'lkr' },
  commission: { type: Number },
  ownerPayout: { type: Number },
  stripeSessionId: { type: String, index: true },
  stripePaymentIntentId: { type: String, index: true },
  status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
  method: { type: String, default: 'card' },
  paidAt: { type: Date },
  rawSession: { type: Object },
  billingInfo: {
    fullName: { type: String },
    nic: { type: String },
    address: { type: String },
    phone: { type: String },
    termsAcceptedAt: { type: Date },
  },
}, { timestamps: true });

// Allow at most one payment per type per booking per user (one 'rental' and one 'late_fee')
paymentSchema.index({ booking: 1, user: 1, type: 1 }, { unique: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
