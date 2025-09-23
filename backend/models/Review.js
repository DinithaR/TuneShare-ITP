import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const reviewSchema = new Schema(
  {
    instrument: { type: Types.ObjectId, ref: 'Instrument', required: true, index: true },
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// One review per user per instrument
reviewSchema.index({ instrument: 1, user: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;
