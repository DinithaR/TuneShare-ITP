
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
    commission: {type: Number},
    ownerPayout: {type: Number},
    paidAt: {type: Date}
},{timestamps: true})

const Booking = mongoose.model('Booking', instrumentSchema)

export default Booking
