import express from "express";
import { protect, isOwner } from "../middleware/auth.js";
import { 
  createBooking, 
  getOwnerBookings, 
  changeBookingStatus,
  getUserBookings,
  updateUserBooking,
  deleteUserBooking,
  getBookingById
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

export default bookingRouter;