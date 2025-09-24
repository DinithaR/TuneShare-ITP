import express from "express";
import { protect, isAdmin } from "../middleware/auth.js";
import {
  saveCustomerEnquiry,
  getAllEnquiries,
  updateEnquiryStatus,
  getEnquiryById,
} from "../controllers/enquiryController.js";

const enquiryRouter = express.Router();

// Save customer enquiry (public route - no auth required)
enquiryRouter.post("/save", saveCustomerEnquiry);

// Admin routes
enquiryRouter.get("/all", protect, isAdmin, getAllEnquiries);
enquiryRouter.get("/:id", protect, isAdmin, getEnquiryById);
enquiryRouter.put("/status", protect, isAdmin, updateEnquiryStatus);

export default enquiryRouter;
