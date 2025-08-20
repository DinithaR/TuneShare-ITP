import express from "express";
import { protect } from "../middleware/auth.js";
import { 
  createBooking, 
  getOwnerBookings, 
  changeBookingStatus,
  getUserBookings,
  updateUserBooking,
  deleteUserBooking
} from "../controllers/bookingController.js";

const bookingRouter = express.Router();

// User routes
bookingRouter.post("/create", protect, createBooking);
bookingRouter.get("/user", protect, getUserBookings);
bookingRouter.put("/user/:id", protect, updateUserBooking);
bookingRouter.delete("/user/:id", protect, deleteUserBooking);

// Owner routes  
bookingRouter.get("/owner", protect, getOwnerBookings);
bookingRouter.post("/change-status", protect, changeBookingStatus);

export default bookingRouter;