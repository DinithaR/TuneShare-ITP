import express from 'express';
import { protect } from '../middleware/auth.js';
import { upsertReview, getInstrumentReviews, getMyReview, deleteReview, getRatingsSummary } from '../controllers/reviewController.js';

const reviewRouter = express.Router();

// Public: list reviews for an instrument
reviewRouter.get('/instrument/:instrumentId', getInstrumentReviews);

// Public: ratings summary for all instruments
reviewRouter.get('/summary', getRatingsSummary);

// Auth-required: get my review for an instrument
reviewRouter.get('/instrument/:instrumentId/me', protect, getMyReview);

// Auth-required: create or update my review
reviewRouter.post('/upsert', protect, upsertReview);

// Auth-required: delete my review (or admin)
reviewRouter.delete('/:id', protect, deleteReview);

export default reviewRouter;
