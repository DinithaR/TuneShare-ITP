import express from "express";
import { protect, isOwner } from "../middleware/auth.js";
import { 
  createBooking, 
  getOwnerBookings, 
  changeBookingStatus,
  getUserBookings,
  updateUserBooking,
  deleteUserBooking,
  getBookingById,
  markPickup,
  markReturn,
  generateOwnerBookingsReport,
  checkAvailability
} from "../controllers/bookingController.js";

const bookingRouter = express.Router();

// User routes
bookingRouter.post("/create", protect, createBooking);
bookingRouter.get("/user", protect, getUserBookings);
bookingRouter.get("/one/:id", protect, getBookingById);
bookingRouter.put("/user/:id", protect, updateUserBooking);
bookingRouter.delete("/user/:id", protect, deleteUserBooking);

// Owner routes  
bookingRouter.get("/owner", protect, isOwner, getOwnerBookings);
bookingRouter.post("/change-status", protect, isOwner, changeBookingStatus);
bookingRouter.post('/mark-pickup', protect, isOwner, markPickup);
bookingRouter.post('/mark-return', protect, isOwner, markReturn);
bookingRouter.get('/owner/report', protect, isOwner, generateOwnerBookingsReport);

// Public route: check availability
bookingRouter.post('/check-availability', checkAvailability);

export default bookingRouter;