import Booking from "../models/Booking.js";
import Instrument from "../models/Instrument.js";
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';

// API to get owner bookings
export const getOwnerBookings = async (req, res) => {
    try {
        const { _id, role } = req.user; // role validated by isOwner
    const { page = 1, limit = 20, q, status, paymentStatus, scope } = req.query;
        // scope (admin only): ?scope=all to view every booking, otherwise defaults to admin's own listings ("mine")

        const pageNum = Math.max(parseInt(page) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

        // Determine scope: admins can request 'all' or 'mine'; owners always 'mine'
        let effectiveScope = 'owner';
        if (role === 'admin') {
            effectiveScope = scope === 'all' ? 'all' : (scope === 'mine' ? 'owner' : 'all');
        }
        const baseQuery = effectiveScope === 'all' ? {} : { owner: _id };

        if (status) {
            const statuses = status.split(',').map(s => s.trim().toLowerCase()).filter(s => ['pending','confirmed','cancelled'].includes(s));
            if (statuses.length === 1) baseQuery.status = statuses[0];
            else if (statuses.length > 1) baseQuery.status = { $in: statuses };
        }

        if (paymentStatus && ['paid','pending'].includes(paymentStatus)) {
            baseQuery.paymentStatus = paymentStatus;
        }

        // If no search query, simple find with pagination
        if (!q) {
            const [bookings, total] = await Promise.all([
                Booking.find(baseQuery)
                    .populate('instrument')
                    .populate('user', 'name email')
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * pageSize)
                    .limit(pageSize),
                Booking.countDocuments(baseQuery)
            ]);
            return res.json({
                success: true,
                bookings,
                page: pageNum,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
                scope: effectiveScope
            });
        }

        // Search across instrument fields and booking status
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        const pipeline = [
            { $match: baseQuery },
            { $lookup: { from: 'instruments', localField: 'instrument', foreignField: '_id', as: 'instrument' } },
            { $unwind: '$instrument' },
            { $match: { $or: [
                { 'instrument.brand': regex },
                { 'instrument.model': regex },
                { 'instrument.category': regex },
                { 'instrument.location': regex },
                { status: regex }
            ]}},
            { $sort: { createdAt: -1 } },
            { $facet: {
                data: [ { $skip: (pageNum - 1) * pageSize }, { $limit: pageSize } ],
                totalCount: [ { $count: 'count' } ]
            }}
        ];
        const agg = await Booking.aggregate(pipeline);
        const data = agg[0]?.data || [];
        const total = agg[0]?.totalCount?.[0]?.count || 0;
        res.json({
            success: true,
            bookings: data,
            page: pageNum,
            limit: pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
            scope: effectiveScope
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// API to change booking status
export const changeBookingStatus = async (req, res) => {
    try {
        const { _id, role } = req.user;
        const { bookingId, status } = req.body;
        // Role validation handled by isOwner middleware now (owner or admin)

        // Valid status values
        const validStatuses = ['pending', 'confirmed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.json({ success: false, message: "Invalid status" });
        }

        const booking = await Booking.findById(bookingId);
        
        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        // Check if booking belongs to this owner
        if (role !== 'admin' && booking.owner.toString() !== _id.toString()) {
            return res.json({ success: false, message: "Unauthorized" });
        }

        // Prevent confirming unless payment completed
        if (status === 'confirmed' && booking.paymentStatus !== 'paid') {
            return res.json({ success: false, message: 'Cannot confirm before payment is completed.' });
        }

        const previousStatus = booking.status;
        booking.status = status;
        // If moving to cancelled and no timestamp yet, set cancelledAt
        if (status === 'cancelled' && !booking.cancelledAt) {
            booking.cancelledAt = new Date();
        }
        // If status changed away from cancelled (edge case), clear timestamp
        if (previousStatus === 'cancelled' && status !== 'cancelled') {
            booking.cancelledAt = undefined;
        }
        await booking.save();

        res.json({ 
            success: true, 
            message: `Booking ${status} successfully`,
            booking 
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// API to create booking (for your InstrumentDetails page)
export const createBooking = async (req, res) => {
    try {
        const { _id } = req.user;
        const { instrument, pickupDate, returnDate } = req.body;

        // Get instrument details
        const instrumentData = await Instrument.findById(instrument);
        
        if (!instrumentData) {
            return res.json({ success: false, message: "Instrument not found" });
        }

        // Prevent owner from booking own instrument
        if (instrumentData.owner && instrumentData.owner.toString() === _id.toString()) {
            return res.json({ success: false, message: "Owners cannot book their own instruments." });
        }

        if (!instrumentData.isAvailable) {
            return res.json({ success: false, message: "Instrument not available" });
        }

        // Calculate price (days * pricePerDay)
        const days = Math.ceil((new Date(returnDate) - new Date(pickupDate)) / (1000 * 60 * 60 * 24));
        const price = days * instrumentData.pricePerDay;

        const booking = await Booking.create({
            instrument,
            user: _id,
            owner: instrumentData.owner,
            pickupDate,
            returnDate,
            price
        });

        res.json({ success: true, message: "Booking created successfully", booking });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// API to get user bookings
export const getUserBookings = async (req, res) => {
    try {
        const { _id } = req.user;
    const { q, page = 1, limit = 10, startDate, endDate, paymentStatus, status } = req.query;
        // Booking status filter (supports single value or comma separated list)
        if (status) {
            const validStatuses = ['pending', 'confirmed', 'cancelled'];
            const statuses = status.split(',').map(s => s.trim().toLowerCase()).filter(s => validStatuses.includes(s));
            if (statuses.length === 1) {
                baseMatch.status = statuses[0];
            } else if (statuses.length > 1) {
                baseMatch.status = { $in: statuses };
            }
        }

        const pageNum = Math.max(parseInt(page) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

        const baseMatch = { user: new mongoose.Types.ObjectId(_id) };

        // Date range overlap filtering
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start && end) {
                baseMatch.$and = [
                    { pickupDate: { $lte: end } },
                    { returnDate: { $gte: start } }
                ];
            } else if (start) {
                baseMatch.returnDate = { $gte: start };
            } else if (end) {
                baseMatch.pickupDate = { $lte: end };
            }
        }

        if (paymentStatus && ['paid', 'pending'].includes(paymentStatus)) {
            baseMatch.paymentStatus = paymentStatus;
        }

        if (!q) {
            const [bookings, total] = await Promise.all([
                Booking.find(baseMatch)
                    .populate('instrument')
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * pageSize)
                    .limit(pageSize),
                Booking.countDocuments(baseMatch)
            ]);
            return res.json({
                success: true,
                bookings,
                page: pageNum,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            });
        }

        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');

        const pipeline = [
            { $match: baseMatch },
            { $lookup: { from: 'instruments', localField: 'instrument', foreignField: '_id', as: 'instrument' } },
            { $unwind: '$instrument' },
            { $match: { $or: [
                { 'instrument.brand': regex },
                { 'instrument.model': regex },
                { 'instrument.category': regex },
                { 'instrument.location': regex },
                { status: regex }
            ]}},
            { $sort: { createdAt: -1 } },
            { $facet: {
                data: [
                    { $skip: (pageNum - 1) * pageSize },
                    { $limit: pageSize }
                ],
                totalCount: [ { $count: 'count' } ]
            }}
        ];

        const agg = await Booking.aggregate(pipeline);
        const data = agg[0]?.data || [];
        const total = agg[0]?.totalCount?.[0]?.count || 0;

        res.json({
            success: true,
            bookings: data,
            page: pageNum,
            limit: pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// API: get single booking (user must own it, or be owner/admin of instrument)
export const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const requester = req.user;
        const booking = await Booking.findById(id).populate('instrument').populate('user', 'name email');
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        const ownsAsUser = booking.user._id.toString() === requester._id.toString();
        const ownsAsOwner = booking.owner.toString() === requester._id.toString();
        const isAdmin = requester.role === 'admin';
        if (!ownsAsUser && !ownsAsOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        res.json({ success: true, booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update a user's booking
export const updateUserBooking = async (req, res) => {
  try {
    const { _id } = req.user;
    const { id } = req.params;
    const { pickupDate, returnDate } = req.body;

    const booking = await Booking.findOne({ _id: id, user: _id });
    if (!booking) return res.json({ success: false, message: "Booking not found" });

        // Disallow editing if already paid or cancelled (client guards too)
        if (booking.paymentStatus === 'paid' || booking.status === 'cancelled') {
            return res.json({ success: false, message: 'Cannot edit a paid or cancelled booking' });
        }

        // Determine new dates
        const newPickup = pickupDate ? new Date(pickupDate) : new Date(booking.pickupDate);
        const newReturn = returnDate ? new Date(returnDate) : new Date(booking.returnDate);
        if (isNaN(newPickup) || isNaN(newReturn)) {
            return res.json({ success: false, message: 'Invalid date(s) provided' });
        }
        if (newReturn <= newPickup) {
            return res.json({ success: false, message: 'Return date must be after pickup date' });
        }

        // Recalculate price based on instrument's pricePerDay
        const instrument = await Instrument.findById(booking.instrument);
        if (!instrument) {
            return res.json({ success: false, message: 'Instrument not found for this booking' });
        }
        const msInDay = 24 * 60 * 60 * 1000;
        const days = Math.max(1, Math.ceil((newReturn - newPickup) / msInDay));
        const newPrice = days * (instrument.pricePerDay || 0);

        booking.pickupDate = newPickup;
        booking.returnDate = newReturn;
        booking.price = newPrice;
        await booking.save();

    res.json({ success: true, message: "Booking updated", booking });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Delete a user's booking
export const deleteUserBooking = async (req, res) => {
    try {
        const { _id } = req.user;
        const { id } = req.params;

        const booking = await Booking.findOne({ _id: id, user: _id });
        if (!booking) return res.json({ success: false, message: "Booking not found" });

        // Prevent cancelling confirmed booking (business rule remains)
        if (booking.status === 'confirmed') {
            return res.json({ success: false, message: "Cannot cancel a confirmed booking." });
        }
        if (booking.status === 'cancelled') {
            return res.json({ success: true, message: "Booking already cancelled", booking });
        }
        // Soft-cancel: we do not delete the booking record; retain for audit & analytics
        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        await booking.save();
        res.json({ success: true, message: "Booking cancelled", booking });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Owner marks that the renter has picked up the instrument
export const markPickup = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const { _id: ownerId, role } = req.user;
        const booking = await Booking.findById(bookingId).populate('instrument');
        if (!booking) return res.json({ success: false, message: 'Booking not found' });
        if (role !== 'admin' && booking.owner.toString() !== ownerId.toString()) {
            return res.json({ success: false, message: 'Unauthorized' });
        }
        if (booking.paymentStatus !== 'paid' || booking.status !== 'confirmed') {
            return res.json({ success: false, message: 'Cannot mark pickup until booking is paid and confirmed.' });
        }
        if (booking.pickupConfirmedAt) {
            return res.json({ success: false, message: 'Pickup already marked.' });
        }
        // Set pickup timestamp
        booking.pickupConfirmedAt = new Date();
        // Make instrument unavailable
        if (booking.instrument && booking.instrument.isAvailable) {
            booking.instrument.isAvailable = false;
            await booking.instrument.save();
        }
        await booking.save();
        res.json({ success: true, message: 'Pickup marked successfully', booking });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Owner marks that the renter has returned the instrument
export const markReturn = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const { _id: ownerId, role } = req.user;
        const booking = await Booking.findById(bookingId).populate('instrument');
        if (!booking) return res.json({ success: false, message: 'Booking not found' });
        if (role !== 'admin' && booking.owner.toString() !== ownerId.toString()) {
            return res.json({ success: false, message: 'Unauthorized' });
        }
        if (!booking.pickupConfirmedAt) {
            return res.json({ success: false, message: 'Pickup not yet marked.' });
        }
        if (booking.returnConfirmedAt) {
            return res.json({ success: false, message: 'Return already marked.' });
        }
        booking.returnConfirmedAt = new Date();
        // Late return calculation
        try {
            const plannedReturn = new Date(booking.returnDate);
            const actualReturn = booking.returnConfirmedAt;
            const msInDay = 24 * 60 * 60 * 1000;
            // Calculate late days (ceil for any partial day late)
            const diffMs = actualReturn - plannedReturn;
            const lateDays = diffMs > 0 ? Math.ceil(diffMs / msInDay) : 0;
            booking.lateDays = lateDays;
            if (lateDays > 0 && booking.instrument?.pricePerDay) {
                booking.lateFee = lateDays * booking.instrument.pricePerDay;
                booking.lateFeePaid = false;
            } else {
                booking.lateFee = 0;
                booking.lateFeePaid = true; // no fee needed
            }
        } catch (e) {
            // do not block return on computation errors
            console.warn('Late fee compute failed:', e.message);
        }
        // Make instrument available again
        if (booking.instrument && !booking.instrument.isAvailable) {
            booking.instrument.isAvailable = true;
            await booking.instrument.save();
        }
        await booking.save();
    res.json({ success: true, message: 'Return marked successfully', booking });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Public: Check instrument availability for a location and date range
export const checkAvailability = async (req, res) => {
    try {
        const { location, pickupDate, returnDate, q } = req.body || {};
        if (!location || !pickupDate || !returnDate) {
            return res.json({ success: false, message: 'location, pickupDate and returnDate are required' });
        }

        const start = new Date(pickupDate);
        const end = new Date(returnDate);
        if (isNaN(start) || isNaN(end)) {
            return res.json({ success: false, message: 'Invalid date(s) provided' });
        }
        if (end < start) {
            return res.json({ success: false, message: 'returnDate must be on or after pickupDate' });
        }

        // Find instruments in the location, currently marked available
        const baseInstrumentQuery = { location, isAvailable: true };

        // Find bookings that overlap the requested range (excluding cancelled)
        const overlapping = await Booking.find({
            status: { $ne: 'cancelled' },
            pickupDate: { $lte: end },
            returnDate: { $gte: start }
        }).select('instrument');

        const blockedInstrumentIds = new Set(overlapping.map(b => String(b.instrument)));

        // Apply optional keyword filtering
        let instrumentsQuery = Instrument.find(baseInstrumentQuery);
        if (q && typeof q === 'string' && q.trim()) {
            const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'i');
            instrumentsQuery = Instrument.find({
                ...baseInstrumentQuery,
                $or: [
                    { brand: regex },
                    { model: regex },
                    { category: regex },
                    { location: regex },
                    { description: regex }
                ]
            });
        }

        const candidates = await instrumentsQuery.sort({ createdAt: -1 });
        const availableInstruments = candidates.filter(inst => !blockedInstrumentIds.has(String(inst._id)));

        res.json({ success: true, availableInstruments });
    } catch (error) {
        console.error('checkAvailability error:', error);
        res.json({ success: false, message: 'Failed to check availability' });
    }
};

// Generate PDF report for owner's bookings (previous and current)
export const generateOwnerBookingsReport = async (req, res) => {
    try {
        const { _id, role } = req.user; // isOwner middleware ensures owner or admin
        const { range = 'all' } = req.query; // future use for custom date ranges

        // Build base match: admins can optionally pass ownerId to generate for a specific owner
        let ownerId = _id;
        if (role === 'admin' && req.query.ownerId) {
            ownerId = req.query.ownerId;
        }

        // Define previous vs current: previous = bookings with returnDate < today; current = pickupDate <= today <= returnDate OR status pending/confirmed and not ended
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const query = { owner: ownerId };
        const bookings = await Booking.find(query).populate('instrument').populate('user','name email').sort({ createdAt: -1 });

        const previous = [];
        const current = [];
        bookings.forEach(b => {
            const returnDate = new Date(b.returnDate);
            const pickupDate = new Date(b.pickupDate);
            if (returnDate < startOfToday) previous.push(b); else current.push(b);
        });

        // Start PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="booking_report.pdf"');
        doc.pipe(res);

        const primaryColor = '#d6336c';
        const muted = '#555555';

        // Header
        doc.fillColor(primaryColor).fontSize(22).text('Instrument Booking Report', { align: 'left' });
        doc.moveDown(0.2);
        doc.fillColor(muted).fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
        doc.fillColor(muted).fontSize(10).text(`Owner ID: ${ownerId}`);
        if (role === 'admin') doc.text(`Generated by: ADMIN (${_id})`);
        doc.moveDown(0.8);

        const sectionTitle = (title) => {
            doc.moveDown(0.6);
            doc.fillColor(primaryColor).fontSize(14).text(title);
            doc.moveTo(doc.x, doc.y + 2).lineTo(550, doc.y + 2).strokeColor(primaryColor).lineWidth(1).stroke();
            doc.moveDown(0.4);
            doc.fillColor('#000');
        };

        const tableHeader = (cols) => {
            doc.fontSize(9).fillColor('#222');
            cols.forEach((c, i) => {
                doc.text(c, 50 + i*100, doc.y, { continued: i !== cols.length - 1, width: 100 });
            });
            doc.moveDown(0.6);
        };
        const row = (values) => {
            doc.fontSize(8).fillColor('#000');
            values.forEach((v, i) => {
                doc.text(String(v), 50 + i*100, doc.y, { continued: i !== values.length -1, width: 100 });
            });
            doc.moveDown(0.4);
            if (doc.y > 750) doc.addPage();
        };

        const renderSection = (label, list) => {
            sectionTitle(label + ` (${list.length})`);
            if (!list.length) {
                doc.fontSize(9).fillColor(muted).text('No records');
                return;
            }
            tableHeader(['Booking', 'Instrument', 'Dates', 'Price', 'Status']);
            list.forEach(b => {
                const inst = b.instrument ? `${b.instrument.brand||''} ${b.instrument.model||''}`.trim() : 'N/A';
                const dates = `${new Date(b.pickupDate).toLocaleDateString()}\n${new Date(b.returnDate).toLocaleDateString()}`;
                const status = `${b.status}${b.paymentStatus==='paid' ? '\npaid' : ''}${b.cancelledAt ? '\n(cancelled)' : ''}`;
                row([
                    b._id,
                    inst,
                    dates,
                    b.price != null ? b.price : '-',
                    status
                ]);
            });
        };

        renderSection('Current Bookings', current);
        renderSection('Previous Bookings', previous);

        // Summary
        sectionTitle('Summary');
        const totalRevenue = bookings.filter(b=>b.paymentStatus==='paid').reduce((sum,b)=>sum + (b.price||0),0);
        const cancelledCount = bookings.filter(b=>b.status==='cancelled').length;
        doc.fontSize(10).fillColor('#000').list([
            `Total bookings: ${bookings.length}`,
            `Current bookings: ${current.length}`,
            `Previous bookings: ${previous.length}`,
            `Cancelled bookings: ${cancelledCount}`,
            `Total paid revenue: ${totalRevenue}`
        ], { bulletRadius: 2 });

        doc.end();
    } catch (error) {
        console.error('Report generation failed:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report', error: error.message });
    }
};