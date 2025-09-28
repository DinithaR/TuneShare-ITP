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

// Admin: list reviews with optional filters and pagination
export const adminListReviews = async (req, res) => {
  try {
    const { instrumentId, userId, page = 1, limit = 20, from, to } = req.query;
    const filter = {};
    if (instrumentId) filter.instrument = instrumentId;
    if (userId) filter.user = userId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        // include full day
        end.setHours(23,59,59,999);
        filter.createdAt.$lte = end;
      }
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Review.find(filter)
        .populate('user', 'name email')
        .populate('instrument', 'brand model category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments(filter),
    ]);

    res.json({
      success: true,
      reviews: items,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: export reviews as CSV
export const adminExportReviewsPdf = async (req, res) => {
  try {
    const { instrumentId, userId, from, to } = req.query;
    const filter = {};
    if (instrumentId) filter.instrument = instrumentId;
    if (userId) filter.user = userId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23,59,59,999);
        filter.createdAt.$lte = end;
      }
    }

    const rows = await Review.find(filter)
      .populate('user', 'name email')
      .populate('instrument', 'brand model category location')
      .sort({ createdAt: -1 });

    // Compute summary
    const count = rows.length;
    const ratings = rows.map(r => r.rating);
    const sum = ratings.reduce((a,b)=>a+b,0);
    const avg = count ? (sum / count) : 0;
    const min = count ? Math.min(...ratings) : 0;
    const max = count ? Math.max(...ratings) : 0;

    // Build PDF (A4 = 595x842 pt)
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    const fileName = `reviews_report_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Pipe to response
    doc.pipe(res);

    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right; // 515
    const startX = doc.page.margins.left;
    const startY = doc.page.margins.top;
    const bottomY = doc.page.height - doc.page.margins.bottom;

    // Layout columns: Date, Instrument, User, Rating, Comment
    const columns = [
      { key: 'date', label: 'Date', width: 70 },
      { key: 'instrument', label: 'Instrument', width: 160 },
      { key: 'user', label: 'User', width: 120 },
      { key: 'rating', label: 'Rating', width: 40, align: 'center' },
      { key: 'comment', label: 'Comment', width: 125 },
    ];

    // Helpers
    let pageNum = 1;

    const drawHeader = () => {
      doc.fontSize(18).fillColor('#111').text('Ratings & Reviews Report', startX, startY, { width: contentWidth, align: 'left' });
      const rangeText = `${from ? `From ${new Date(from).toLocaleDateString()}` : ''}${from && to ? ' ' : ''}${to ? `To ${new Date(to).toLocaleDateString()}` : ''}` || 'All time';
      doc.fontSize(10).fillColor('#555').text(rangeText, startX, doc.y + 2, { width: contentWidth });

      // Summary boxes
      const boxGap = 8;
      const boxW = (contentWidth - boxGap * 3) / 4;
      const boxH = 40;
      const boxesY = doc.y + 12;
      const summaryItems = [
        { label: 'Total Reviews', value: String(count) },
        { label: 'Average Rating', value: avg.toFixed(2) },
        { label: 'Min Rating', value: String(min) },
        { label: 'Max Rating', value: String(max) },
      ];
      summaryItems.forEach((it, idx) => {
        const x = startX + idx * (boxW + boxGap);
        doc.roundedRect(x, boxesY, boxW, boxH, 6).stroke('#ddd');
        doc.fontSize(8).fillColor('#666').text(it.label, x + 8, boxesY + 8, { width: boxW - 16 });
        doc.fontSize(14).fillColor('#111').text(it.value, x + 8, boxesY + 18, { width: boxW - 16 });
      });
      return boxesY + boxH + 12;
    };

    const drawTableHeader = (y) => {
      // Header background
      doc.rect(startX, y, contentWidth, 18).fill('#f0f0f0');
      doc.fillColor('#111').fontSize(10);
      let x = startX + 6;
      columns.forEach((col) => {
        doc.text(col.label, x, y + 4, { width: col.width - 12, align: col.align || 'left' });
        x += col.width;
      });
      return y + 18;
    };

    const drawFooter = () => {
      const text = `Page ${pageNum}`;
      doc.fontSize(9).fillColor('#666').text(text, startX, bottomY - 10, { width: contentWidth, align: 'right' });
    };

    const getRowHeight = (row) => {
      doc.fontSize(9);
      const heights = columns.map((col) => {
        const text = String(row[col.key] ?? '');
        return Math.max(16, doc.heightOfString(text, { width: col.width - 12 }));
      });
      return Math.max(...heights) + 6; // padding
    };

    const drawRow = (y, row, zebra) => {
      const rowH = getRowHeight(row);
      // background
      if (zebra) {
        doc.rect(startX, y, contentWidth, rowH).fill('#fafafa');
        doc.fillColor('#111');
      }
      // borders
      doc.rect(startX, y, contentWidth, rowH).stroke('#eaeaea');
      // text
      let x = startX + 6;
      doc.fontSize(9).fillColor('#111');
      columns.forEach((col) => {
        const text = String(row[col.key] ?? '');
        doc.text(text, x, y + 3, { width: col.width - 12, align: col.align || 'left' });
        x += col.width;
      });
      return y + rowH;
    };

    // Prepare rows data mapped to columns
    const mapRow = (r) => ({
      date: new Date(r.createdAt).toLocaleDateString(),
      instrument: `${r.instrument?.brand || ''} ${r.instrument?.model || ''}`.trim(),
      user: r.user?.name || '',
      rating: String(r.rating),
      comment: r.comment || ''
    });

    // First page
    let cursorY = drawHeader();
    cursorY = drawTableHeader(cursorY);

    let zebra = false;
    for (const r of rows) {
      const row = mapRow(r);
      const rowH = getRowHeight(row);
      if (cursorY + rowH > bottomY - 20) {
        // Footer + new page
        drawFooter();
        doc.addPage();
        pageNum += 1;
        cursorY = drawTableHeader(startY);
      }
      cursorY = drawRow(cursorY, row, zebra);
      zebra = !zebra;
    }

    // Final footer
    drawFooter();

    doc.end();
  } catch (error) {
    // If headers already sent due to piping, we cannot change them—attempt to end stream.
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    } else {
      try { res.end(); } catch {}
    }
  }
};

// Admin: summary stats
export const adminSummaryReviews = async (req, res) => {
  try {
    const { instrumentId, userId, from, to } = req.query;
    const match = {};
    if (instrumentId) match.instrument = new mongoose.Types.ObjectId(instrumentId);
    if (userId) match.user = new mongoose.Types.ObjectId(userId);
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23,59,59,999);
        match.createdAt.$lte = end;
      }
    }

    const [overall, byInstrument] = await Promise.all([
      Review.aggregate([
        { $match: match },
        { $group: { _id: null, count: { $sum: 1 }, avgRating: { $avg: '$rating' }, minRating: { $min: '$rating' }, maxRating: { $max: '$rating' } } }
      ]),
      Review.aggregate([
        { $match: match },
        { $group: { _id: '$instrument', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'instruments', localField: '_id', foreignField: '_id', as: 'instrument' } },
        { $unwind: '$instrument' },
        { $project: { _id: 0, instrumentId: '$instrument._id', brand: '$instrument.brand', model: '$instrument.model', category: '$instrument.category', count: 1, avgRating: 1 } }
      ])
    ]);

    res.json({
      success: true,
      overall: overall[0] || { count: 0, avgRating: 0, minRating: 0, maxRating: 0 },
      topInstruments: byInstrument
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public: get random reviews to show as testimonials
export const getRandomReviews = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 20);
    const pipeline = [
      { $sample: { size: limit } },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'instruments', localField: 'instrument', foreignField: '_id', as: 'instrument' } },
      { $unwind: { path: '$instrument', preserveNullAndEmptyArrays: true } },
      { $project: {
          _id: 1,
          rating: 1,
          comment: 1,
          createdAt: 1,
          'user._id': 1,
          'user.name': 1,
          'user.image': 1,
          'instrument._id': 1,
          'instrument.brand': 1,
          'instrument.model': 1,
          'instrument.image': 1,
          'instrument.category': 1,
        }
      }
    ];
    const items = await Review.aggregate(pipeline);
    res.json({ success: true, reviews: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
