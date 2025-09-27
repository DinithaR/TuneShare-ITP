import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./configs/db.js";
import userRouter from "./routes/UserRoutes.js";
import ownerRouter from "./routes/OwnerRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import Payment from "./models/Payment.js";

//Initialize Express App
const app = express();

// Stripe webhook must use raw body parser for signature verification BEFORE express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

//Connect Database
await connectDB();

//Middleware
app.use(cors());
app.use(express.json());

// Ensure Payment indexes are up-to-date (drop old unique index without type if present)
try {
	// Mongoose index names are usually the pattern of keys
	await Payment.collection.dropIndex('booking_1_user_1');
	console.log('[Startup] Dropped legacy index booking_1_user_1 on payments');
} catch (e) {
	if (!/index not found/i.test(String(e?.message || ''))) {
		console.warn('[Startup] Drop legacy index warning:', e.message);
	}
}
try {
	await Payment.syncIndexes();
	console.log('[Startup] Payment indexes synchronized');
} catch (e) {
	console.warn('[Startup] Payment.syncIndexes() warning:', e.message);
}

app.get('/', (req, res) => res.send("Server is running."));
app.use('/api/user', userRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/enquiry', enquiryRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server runnig on port ${PORT}`));