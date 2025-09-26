import imagekit from "../configs/imageKit.js";
import Booking from "../models/Booking.js";
import Instrument from "../models/Instrument.js";
import User from "../models/User.js";
import fs from "fs";

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
        const instruments = await Instrument.find({owner: _id})
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

        instrument.owner = null;
        instrument.isAvailable = false;

        await instrument.save()

        res.json({success: true, message: "Instrument Removed", instrument})
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

        const instruments = await Instrument.find({owner: _id})
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
