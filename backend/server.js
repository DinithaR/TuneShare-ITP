import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./configs/db.js";
import userRouter from "./routes/UserRoutes.js";
import ownerRouter from "./routes/OwnerRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

//Initialize Express App
const app = express();

// Stripe webhook must use raw body parser for signature verification BEFORE express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

//Connect Database
await connectDB();

//Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send("Server is running."));
app.use('/api/user', userRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server runnig on port ${PORT}`));