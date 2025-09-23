import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import mongoose from 'mongoose';

// Helper to compute average and count for an instrument
const getAggregateForInstrument = async (instrumentId) => {
  const result = await Review.aggregate([
    { $match: { instrument: new mongoose.Types.ObjectId(instrumentId) } },
    { $group: { _id: '$instrument', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  return result[0] || { avgRating: 0, count: 0 };
};

// Get rating summary for all instruments
export const getRatingsSummary = async (_req, res) => {
  try {
    const rows = await Review.aggregate([
      { $group: { _id: '$instrument', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    // Return as a map for convenient client usage
    const summary = {};
    for (const r of rows) {
      summary[r._id.toString()] = { avgRating: r.avgRating, count: r.count };
    }
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create or update a review by the same user for an instrument
export const upsertReview = async (req, res) => {
  try {
    const { _id: userId, role } = req.user;
    const { instrumentId, rating, comment } = req.body;

    if (!instrumentId || !rating) {
      return res.status(400).json({ success: false, message: 'instrumentId and rating are required' });
    }

    // Optional: ensure user booked and completed (confirmed) before review
    const booking = await Booking.findOne({ user: userId, instrument: instrumentId, status: 'confirmed' });
    if (!booking && role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can review only after a completed booking' });
    }

    const review = await Review.findOneAndUpdate(
      { instrument: instrumentId, user: userId },
      { $set: { rating, comment: comment || '' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('user', 'name image');

    const stats = await getAggregateForInstrument(instrumentId);

    res.json({ success: true, review, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all reviews for an instrument with average rating
export const getInstrumentReviews = async (req, res) => {
  try {
    const { instrumentId } = req.params;
    const reviews = await Review.find({ instrument: instrumentId })
      .populate('user', 'name image')
      .sort({ createdAt: -1 });
    const stats = await getAggregateForInstrument(instrumentId);
    res.json({ success: true, reviews, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current user's review for an instrument
export const getMyReview = async (req, res) => {
  try {
    const { instrumentId } = req.params;
    const myReview = await Review.findOne({ instrument: instrumentId, user: req.user._id });
    res.json({ success: true, review: myReview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a review (author or admin)
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params; // review id
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Forbidden' });
    await review.deleteOne();
    const stats = await getAggregateForInstrument(review.instrument.toString());
    res.json({ success: true, message: 'Review deleted', stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
