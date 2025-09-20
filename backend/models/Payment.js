import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const paymentSchema = new Schema({
  booking: { type: Types.ObjectId, ref: 'Booking', required: true, index: true },
  user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
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
}, { timestamps: true });

paymentSchema.index({ booking: 1, user: 1 }, { unique: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
