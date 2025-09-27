import Booking from "../models/Booking.js";
import Instrument from "../models/Instrument.js";
import mongoose from 'mongoose';

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

    booking.pickupDate = pickupDate || booking.pickupDate;
    booking.returnDate = returnDate || booking.returnDate;
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