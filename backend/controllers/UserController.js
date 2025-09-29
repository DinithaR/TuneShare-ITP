// Admin: Get all instruments
export const adminGetAllInstruments = async (req, res) => {
    try {
        const instruments = await Instrument.find();
        res.json({ success: true, instruments });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Admin: Delete instrument
export const adminDeleteInstrument = async (req, res) => {
    try {
        const { instrumentId } = req.params;
        if (!instrumentId) return res.json({ success: false, message: 'Instrument ID required' });
        const instrument = await Instrument.findByIdAndDelete(instrumentId);
        if (!instrument) return res.json({ success: false, message: 'Instrument not found' });
        res.json({ success: true, message: 'Instrument deleted' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Admin: Edit instrument
export const adminEditInstrument = async (req, res) => {
    try {
        const { instrumentId, ...update } = req.body;
        if (!instrumentId) return res.json({ success: false, message: 'Instrument ID required' });
        const instrument = await Instrument.findByIdAndUpdate(instrumentId, update, { new: true, runValidators: true });
        if (!instrument) return res.json({ success: false, message: 'Instrument not found' });
        res.json({ success: true, instrument });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Admin: Change user role
export const changeUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body;
        if (!userId || !role) return res.json({ success: false, message: 'User ID and role required' });
        if (!['user', 'owner', 'admin'].includes(role)) return res.json({ success: false, message: 'Invalid role' });
        const user = await User.findByIdAndUpdate(userId, { role }, { new: true, runValidators: true }).select('-password');
        if (!user) return res.json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Admin: Delete user
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return res.json({ success: false, message: 'User ID required' });
        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Admin: Edit user details (name, email, image)
export const editUser = async (req, res) => {
    try {
        const { userId, name, email, image } = req.body;
        // Only allow editing self unless admin
        if (!userId) return res.json({ success: false, message: 'User ID required' });
        if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
            return res.json({ success: false, message: 'Unauthorized' });
        }
        const update = {};
        if (name) update.name = name;
        if (email) update.email = email;
        if (image) update.image = image;
        const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true }).select('-password');
        if (!user) return res.json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
// Get all instruments
export const getInstruments = async (req, res) => {
    try {
        // Only return active, non-deleted, available instruments with a valid owner
        const instruments = await Instrument.find({
            isDeleted: { $ne: true },
            owner: { $ne: null },
            isAvailable: true
        });
        res.json({ success: true, instruments });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get single instrument with owner details
export const getInstrumentById = async (req, res) => {
    try {
        const { id } = req.params;
        const instrument = await Instrument.findById(id).populate('owner', 'name email');
        if (!instrument || instrument.isDeleted || !instrument.owner) {
            return res.json({ success: false, message: 'Instrument not found' });
        }
        res.json({ success: true, instrument });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
import User from "../models/User.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Instrument from "../models/Instrument.js"

// Generate JWT Token
const generateToken = (userId)=> {
    const payload = userId;
    return jwt.sign(payload, process.env.JWT_SECRET)
}

// Register User
export const registerUser = async (req, res)=>{
    try {
        const {name, email, password} = req.body

        if(!name || !email || !password || password.length < 8){
            return res.json({success: false, message: 'Fill all the fields'})
        }

        const userExists = await User.findOne({email})

        if(userExists){
            return res.json({success: false, message: 'User already exists'})
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({name, email, password: hashedPassword})
        const token = generateToken(user._id.toString())
        res.json({success: true, token, role: user.role})

    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// User Login
export const loginUser = async (req, res) => {
    try {
        const {email, password} = req.body
        const user = await User.findOne({email})
        if(!user){
            return res.json({success: false, message: "User not found"})
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if(!isMatch){
            return res.json({success: false, message: "Invalid Credentials"})
        }
        const token = generateToken(user._id.toString())
        res.json({success: true, token, role: user.role})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// Get user data using Token (JWT)
export const getUserData = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password")
        res.json({success: true, user})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// Promote user to owner
export const becomeOwner = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.user._id, { role: 'owner' }, { new: true });
        res.json({ success: true, user });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Admin: Get all users (with optional search by name/email)
export const getAllUsers = async (req, res) => {
    try {
        const { search } = req.query || {};
        const filter = {};
        if (search && String(search).trim()) {
            const s = String(search).trim();
            filter.$or = [
                { name: { $regex: s, $options: 'i' } },
                { email: { $regex: s, $options: 'i' } },
            ];
        }
        const users = await User.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Admin: Export users as a PDF report
import PDFDocument from 'pdfkit';
export const exportUsersPdf = async (req, res) => {
    try {
        const { search } = req.query || {};
        const filter = {};
        if (search && String(search).trim()) {
            const s = String(search).trim();
            filter.$or = [
                { name: { $regex: s, $options: 'i' } },
                { email: { $regex: s, $options: 'i' } },
            ];
        }

        const users = await User.find(filter).sort({ createdAt: -1 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="users_report_${Date.now()}.pdf"`);

        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        doc.pipe(res);

        // Title
        doc.fontSize(18).text('TuneShare - Users Report', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor('#555').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(1);
        doc.fillColor('black');

        // Summary
        doc.fontSize(12).text(`Total users: ${users.length}`);
        if (search && String(search).trim()) doc.text(`Search filter: "${String(search).trim()}"`);
        doc.moveDown(0.5);

        // Table header
        const colX = { name: 40, email: 200, role: 420, created: 480 };
        let y = doc.y + 10;
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('Name', colX.name, y);
        doc.text('Email', colX.email, y);
        doc.text('Role', colX.role, y);
        doc.text('Created', colX.created, y);
        y += 18;
        doc.moveTo(40, y).lineTo(555, y).strokeColor('#ccc').stroke();
        y += 6;

        // Rows
        doc.font('Helvetica').fontSize(10).strokeColor('#000');
        const lineHeight = 16;
        const maxY = doc.page.height - 60;
        users.forEach(u => {
            // Page break
            if (y > maxY) {
                doc.addPage();
                y = 40;
                doc.font('Helvetica-Bold').fontSize(11);
                doc.text('Name', colX.name, y);
                doc.text('Email', colX.email, y);
                doc.text('Role', colX.role, y);
                doc.text('Created', colX.created, y);
                y += 18;
                doc.moveTo(40, y).lineTo(555, y).strokeColor('#ccc').stroke();
                y += 6;
                doc.font('Helvetica').fontSize(10);
            }
            const created = new Date(u.createdAt).toLocaleDateString();
            doc.text(u.name || '', colX.name, y, { width: colX.email - colX.name - 10, ellipsis: true });
            doc.text(u.email || '', colX.email, y, { width: colX.role - colX.email - 10, ellipsis: true });
            doc.text(u.role || '', colX.role, y, { width: colX.created - colX.role - 10, ellipsis: true });
            doc.text(created, colX.created, y);
            y += lineHeight;
        });

        doc.end();
    } catch (error) {
        // Fallback to JSON error
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
        }
        res.status(500).json({ success: false, message: 'Failed to generate PDF', error: error.message });
    }
}