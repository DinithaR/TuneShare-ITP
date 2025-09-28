import imagekit from "../configs/imageKit.js";
import Booking from "../models/Booking.js";
import Instrument from "../models/Instrument.js";
import User from "../models/User.js";
import fs from "fs";
import PDFDocument from 'pdfkit';

// API to change Role as User
export const changeRoleToOwner = async (req, res)=>{
    try {
        const {_id} = req.user;
        await User.findByIdAndUpdate(_id, {role: "owner"})
        res.json({success: true, message: "Now you can list instruments"})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to List Instrument
export const addInstrument = async (req, res) => {
    try {
        const {_id} = req.user;
        let instrument = JSON.parse(req.body.instrumentData);
        const imageFiles = req.files || [];

        if (!imageFiles.length) {
            return res.json({success: false, message: 'At least one image is required'});
        }

        if (imageFiles.length > 5) {
            return res.json({success: false, message: 'You can upload a maximum of 5 images'});
        }

        // Upload each image to ImageKit and collect optimized URLs
        const uploadedUrls = [];
        for (const imageFile of imageFiles) {
            const fileBuffer = fs.readFileSync(imageFile.path);
            const response = await imagekit.upload({
                file: fileBuffer,
                fileName: imageFile.originalname,
                folder: '/instruments'
            });

            const optimizedImageUrl = imagekit.url({
                path : response.filePath,
                transformation : [
                    {width: '1280'}, // Width resizing
                    {quality: 'auto'}, // Auto compression
                    {format: 'webp'} // Convert to modern format
                ]
            });

            uploadedUrls.push(optimizedImageUrl);
        }

        const image = uploadedUrls[0];
        const images = uploadedUrls;
        await Instrument.create({...instrument, owner: _id, image, images})

        res.json({success: true, message: "Instrument Added"})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to update Instrument details (and optionally images)
export const updateInstrument = async (req, res) => {
    try {
        const { _id } = req.user;
        const payload = JSON.parse(req.body.instrumentData || '{}');
        const { instrumentId, keepImages, ...incoming } = payload;

        if (!instrumentId) {
            return res.json({ success: false, message: 'instrumentId is required' });
        }

        const instrument = await Instrument.findById(instrumentId);
        if (!instrument) {
            return res.json({ success: false, message: 'Instrument not found' });
        }

        if (instrument.owner.toString() !== _id.toString()) {
            return res.json({ success: false, message: 'Unauthorized' });
        }

        // Whitelist updatable fields
        const updatable = ['brand', 'model', 'category', 'pricePerDay', 'location', 'description'];
        updatable.forEach((key) => {
            if (key in incoming) instrument[key] = incoming[key];
        });

        const imageFiles = req.files || [];
        // Upload any new images and merge with keepImages (or existing images) up to 5 total
        const uploadedUrls = [];
        if (imageFiles.length > 0) {
            if (imageFiles.length > 5) {
                return res.json({ success: false, message: 'You can upload a maximum of 5 images at once' });
            }
            for (const imageFile of imageFiles) {
                const fileBuffer = fs.readFileSync(imageFile.path);
                const response = await imagekit.upload({
                    file: fileBuffer,
                    fileName: imageFile.originalname,
                    folder: '/instruments'
                });

                const optimizedImageUrl = imagekit.url({
                    path: response.filePath,
                    transformation: [
                        { width: '1280' },
                        { quality: 'auto' },
                        { format: 'webp' }
                    ]
                });
                uploadedUrls.push(optimizedImageUrl);
            }
        }

        // Determine base images to keep
        let baseImages = Array.isArray(keepImages)
            ? keepImages.filter(Boolean)
            : (Array.isArray(instrument.images) && instrument.images.length > 0
                ? instrument.images
                : (instrument.image ? [instrument.image] : []));

        // Merge and cap to 5
        const merged = [...baseImages, ...uploadedUrls].filter(Boolean);
        const unique = Array.from(new Set(merged));
        const finalImages = unique.slice(0, 5);

        if (finalImages.length === 0) {
            return res.json({ success: false, message: 'At least one image is required' });
        }

        instrument.image = finalImages[0];
        instrument.images = finalImages;

        await instrument.save();
        res.json({ success: true, message: 'Instrument updated', instrument });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// API to List Owner Instruments
export const getOwnerInstruments = async (req, res) => {
    try {
        const {_id} = req.user;
        const instruments = await Instrument.find({owner: _id, isDeleted: { $ne: true }})
        res.json({success: true, instruments})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to Toggle instrument Availability
export const toggleInstrumentAvailability = async (req, res) => {
    try {
        const {_id} = req.user;
        const {instrumentId} = req.body
        const instrument = await Instrument.findById(instrumentId)

        // Checking is car belongs to the user
        if(instrument.owner.toString() !== _id.toString()){
            return res.json({success: false, message: "Unauthorized"})
        }

        instrument.isAvailable = !instrument.isAvailable;
        await instrument.save()

        res.json({success: true, message: "Availability Toggled", instrument})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to delete a instrument
export const deleteInstrument = async (req, res) => {
    try {
        const {_id} = req.user;
        const {instrumentId} = req.body
        const instrument = await Instrument.findById(instrumentId)

        // Checking is car belongs to the user
        if(instrument.owner.toString() !== _id.toString()){
            return res.json({success: false, message: "Unauthorized"})
        }

        // Soft delete instead of removing document to preserve booking history
        instrument.isAvailable = false;
        instrument.isDeleted = true;
        await instrument.save();

        res.json({success: true, message: "Instrument removed", instrument})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to get Dashboard Data
export const getDashboardData = async (req, res) => {
    try {
        const {_id, role} = req.user;

        // Allow both owner and admin
        if(role !== 'owner' && role !== 'admin'){
            return res.json({success: false, message: "Unauthorized"})
        }

    const instruments = await Instrument.find({owner: _id, isDeleted: { $ne: true }})
        const bookings = await Booking.find({owner: _id}).populate('instrument').sort({createdAt: -1});

        const pendingBookings = await Booking.find({owner: _id, status: "pending"})
        const completedBookings = await Booking.find({owner: _id, status: "confirmed"})

        // Calculate monthlyRevenue from bookings where status is confirmed
        const monthlyRevenue = bookings.filter(booking => booking.status === 'confirmed').reduce((acc, booking) => acc + booking.price, 0)

        const dashboardData = {
            totalInstruments: instruments.length,
            totalBookings: bookings.length,
            pendingBookings: pendingBookings.length,
            completedBookings: completedBookings.length,
            recentBookings: bookings.slice(0,3),
            monthlyRevenue
        }

        res.json({success: true, dashboardData});

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to update user image
export const updateUserImage = async (req,res) => {
    try {
        const {_id} = req.user;
        const imageFile = req.file;

        // Upload Image to ImageKit
        const fileBuffer = fs.readFileSync(imageFile.path)
        const response = await imagekit.upload({
            file: fileBuffer,
            fileName: imageFile.originalname,
            folder: '/users'
        })

        // optimization through imagekit URL transformation
        var optimizedImageUrl = imagekit.url({
            path : response.filePath,
            transformation : [
                {width: '400'}, // Width resizing
                {quality: 'auto'}, // Auto compression
                {format: 'webp'} // Convert to modern format
            ]
        });

        const image = optimizedImageUrl;

        await User.findByIdAndUpdate(_id, {image});
        res.json({success: true, message: "Image Upadated"})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// API to generate revenue & bookings report (CSV or JSON)
export const generateOwnerReport = async (req, res) => {
    try {
        const { _id, role } = req.user;
        if (role !== 'owner' && role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { startDate, endDate } = req.query; // format removed – always PDF

        const query = { owner: _id };
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                // include entire end date day
                const d = new Date(endDate);
                d.setHours(23,59,59,999);
                query.createdAt.$lte = d;
            }
        }

        // Only confirmed bookings count toward revenue
        const bookings = await Booking.find(query).populate('instrument');
        const confirmed = bookings.filter(b => b.status === 'confirmed');
        const totalRevenue = confirmed.reduce((sum, b) => sum + (b.price || 0), 0);
        const avgBookingValue = confirmed.length ? (totalRevenue / confirmed.length) : 0;

        const summary = {
            ownerId: _id.toString(),
            period: {
                start: startDate || null,
                end: endDate || null
            },
            generatedAt: new Date().toISOString(),
            totalBookings: bookings.length,
            confirmedBookings: confirmed.length,
            pendingBookings: bookings.filter(b => b.status === 'pending').length,
            cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
            totalRevenue,
            avgBookingValue: Number(avgBookingValue.toFixed(2))
        };

        // Always build PDF
    // Reduced top margin slightly to allow title to appear visually higher
    const doc = new PDFDocument({ margin: { top: 28, bottom: 36, left: 36, right: 36 }, size: 'A4' });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=owner-report-${Date.now()}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);
        });

        const primaryColor = '#F472B6';
        const lightBorder = '#e5e7eb';
        const grayText = '#374151';
        const mutedText = '#6b7280';

        // Header with title and period box
        const header = () => {
            // Start a bit higher manually if first page
            if (doc.page.number === 1) {
                doc.y = 24; // manual vertical position
            }
            doc.fillColor(primaryColor).fontSize(22).text('Owner Revenue & Bookings Report', { align: 'left' });
            const titleBottomY = doc.y; // capture after title
            // Generated timestamp on same top band (right aligned)
            doc.fillColor(mutedText).fontSize(9).text(`Generated: ${new Date(summary.generatedAt).toLocaleString()}` , {
                align: 'right'
            });
            doc.moveDown(0.25);
            doc.fillColor(grayText).fontSize(10).text(`Period: ${summary.period.start || 'N/A'} to ${summary.period.end || 'N/A'}`);
            doc.moveDown(0.3);
            doc.strokeColor(lightBorder).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
            doc.moveDown(0.5);
        };

        header();

        // Page footer with page numbers
        let pageNumber = 1;
        const footer = () => {
            doc.fontSize(8).fillColor(mutedText);
            const bottom = doc.page.height - doc.page.margins.bottom + 10;
            doc.text(`Page ${pageNumber}`, doc.page.margins.left, bottom, { align: 'center', width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
            pageNumber++;
        };
        doc.on('pageAdded', () => {
            header();
        });

        // Summary metric grid
        const summaryData = [
            { label: 'Total Bookings', value: summary.totalBookings },
            { label: 'Confirmed', value: summary.confirmedBookings },
            { label: 'Pending', value: summary.pendingBookings },
            { label: 'Cancelled', value: summary.cancelledBookings },
            { label: 'Total Revenue', value: summary.totalRevenue.toFixed(2) },
            { label: 'Avg Booking Value', value: summary.avgBookingValue.toFixed(2) }
        ];
        const boxWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 20) / 3; // 3 per row
        const boxHeight = 55;
        let x = doc.page.margins.left;
        let y = doc.y;
        summaryData.forEach((item, idx) => {
            doc.roundedRect(x, y, boxWidth, boxHeight, 6).strokeColor(lightBorder).lineWidth(1).stroke();
            doc.fillColor(mutedText).fontSize(8).text(item.label.toUpperCase(), x + 8, y + 8, { width: boxWidth - 16 });
            doc.fillColor(primaryColor).fontSize(16).text(item.value, x + 8, y + 22, { width: boxWidth - 16 });
            x += boxWidth + 10;
            if ((idx + 1) % 3 === 0) { // new row
                x = doc.page.margins.left;
                y += boxHeight + 10;
            }
        });
        doc.moveDown();
        doc.y = y + boxHeight + 15;

        // Per-instrument aggregation table
        const instrumentMap = {};
        bookings.forEach(b => {
            if (!b.instrument) return;
            const key = b.instrument._id.toString();
            if (!instrumentMap[key]) {
                instrumentMap[key] = { brand: b.instrument.brand, model: b.instrument.model, totalRevenue: 0, confirmed: 0 };
            }
            if (b.status === 'confirmed') {
                instrumentMap[key].totalRevenue += (b.price || 0);
                instrumentMap[key].confirmed += 1;
            }
        });
        const instrumentRows = Object.values(instrumentMap).sort((a,b)=> b.totalRevenue - a.totalRevenue);
        if (instrumentRows.length) {
            doc.fillColor(grayText).fontSize(12).text('Per-Instrument Revenue', { underline: true });
            doc.moveDown(0.4);
            // Table header
            const startX = doc.page.margins.left;
            const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
            const colWidths = [tableWidth*0.45, tableWidth*0.2, tableWidth*0.2, tableWidth*0.15];
            let rowY = doc.y;
            const drawRow = (cols, isHeader=false, zebra=false) => {
                if (rowY + 20 > doc.page.height - doc.page.margins.bottom) { doc.addPage(); rowY = doc.y; }
                if (zebra) {
                    doc.rect(startX, rowY - 2, tableWidth, 18).fillOpacity(0.07).fill(primaryColor).fillOpacity(1);
                }
                doc.fillColor(isHeader ? primaryColor : grayText).fontSize(isHeader ? 9 : 8).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
                let cx = startX + 4; cols.forEach((c,i)=>{ doc.text(String(c), cx, rowY, { width: colWidths[i]-8, continued: false }); cx += colWidths[i]; });
                rowY += 18;
            };
            drawRow(['Instrument','Confirmed','Total Revenue','Avg Value'], true);
            instrumentRows.forEach((r, idx) => {
                const avg = r.confirmed ? (r.totalRevenue / r.confirmed).toFixed(2) : '0.00';
                drawRow([`${r.brand || ''} ${r.model || ''}`.trim(), r.confirmed, r.totalRevenue.toFixed(2), avg], false, idx % 2 === 0);
            });
            doc.moveDown();
            doc.y = rowY + 6;
        }

        // Bookings table (paginated, zebra stripes)
        doc.fillColor(grayText).fontSize(12).text('Bookings', { underline: true });
        doc.moveDown(0.4);
        const tableStartX = doc.page.margins.left;
        const tableWidth2 = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const colWidths2 = [tableWidth2*0.09, tableWidth2*0.28, tableWidth2*0.12, tableWidth2*0.12, tableWidth2*0.13, tableWidth2*0.13, tableWidth2*0.13];
        let rowY2 = doc.y;
        const headerRow = ['ID','Instrument','Status','Price','Created','Pickup','Return'];
        const drawBookingRow = (cols, isHeader=false, zebra=false) => {
            if (rowY2 + 20 > doc.page.height - doc.page.margins.bottom) { footer(); doc.addPage(); rowY2 = doc.y; }
            if (zebra) {
                doc.rect(tableStartX, rowY2 - 2, tableWidth2, 18).fillOpacity(0.06).fill(primaryColor).fillOpacity(1);
            }
            doc.fillColor(isHeader ? primaryColor : grayText).fontSize(isHeader ? 8.5 : 7.5).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
            let cx = tableStartX + 3; cols.forEach((c,i)=>{ doc.text(String(c), cx, rowY2, { width: colWidths2[i]-6, continued: false }); cx += colWidths2[i]; });
            rowY2 += 18;
        };
        drawBookingRow(headerRow, true);
        bookings.forEach((b, idx) => {
            if (idx >= 2000) return; // hard upper cap
            const instrumentName = b.instrument ? `${b.instrument.brand || ''} ${b.instrument.model || ''}`.trim().slice(0,30) : 'N/A';
            const line = [
                b._id.toString().slice(-6),
                instrumentName,
                b.status,
                (b.price || 0).toFixed(2),
                b.createdAt ? b.createdAt.toISOString().split('T')[0] : '',
                b.pickupDate ? new Date(b.pickupDate).toISOString().split('T')[0] : '',
                b.returnDate ? new Date(b.returnDate).toISOString().split('T')[0] : ''
            ];
            drawBookingRow(line, false, idx % 2 === 0);
        });
        if (bookings.length > 2000) {
            doc.moveDown().fontSize(8).fillColor(primaryColor).text(`Note: Truncated to 2000 of ${bookings.length} bookings.`);
        }

        footer();

    doc.end();
    return;
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}
