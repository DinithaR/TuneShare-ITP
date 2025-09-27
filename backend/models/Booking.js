
import mongoose from "mongoose";

const {ObjectId} = mongoose.Schema.Types

const instrumentSchema = new mongoose.Schema({
    instrument: {type: ObjectId, ref: "Instrument", required: true},
    user: {type: ObjectId, ref: "User", required: true},
    owner: {type: ObjectId, ref: "User", required: true},
    pickupDate: {type: Date, required: true},
    returnDate: {type: Date, required: true},
    status: {type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending"},
    price: {type: Number, required: true},
    paymentStatus: {type: String, enum: ["pending", "paid"], default: "pending"},
    paymentIntentId: {type: String},
    stripeSessionId: { type: String },
    commission: {type: Number},
    ownerPayout: {type: Number},
    paidAt: {type: Date},
    lastWebhookEventId: { type: String },
    lastWebhookAt: { type: Date },
    // Operational lifecycle timestamps
    pickupConfirmedAt: { type: Date }, // set when owner marks instrument as picked up
    returnConfirmedAt: { type: Date }  // set when owner marks instrument as returned
    ,
    // Cancellation tracking
    cancelledAt: { type: Date } // set when user or owner cancels the booking (status -> cancelled)
},{timestamps: true})

// Helpful indexes for dashboards and webhook lookups
instrumentSchema.index({ owner: 1, status: 1, paymentStatus: 1 });
instrumentSchema.index({ paymentIntentId: 1 });
instrumentSchema.index({ lastWebhookEventId: 1 });
instrumentSchema.index({ stripeSessionId: 1 });
instrumentSchema.index({ pickupConfirmedAt: 1 });
instrumentSchema.index({ returnConfirmedAt: 1 });
instrumentSchema.index({ cancelledAt: 1 });

const Booking = mongoose.model('Booking', instrumentSchema)

export default Booking
