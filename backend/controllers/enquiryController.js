import CustomerEnquiry from "../models/CustomerEnquiry.js";

// Save customer enquiry
export const saveCustomerEnquiry = async (req, res) => {
  try {
    const { customerData, messages } = req.body;

    // Validate required fields
    const {
      name,
      phone,
      email,
      instrument,
      rentDate,
      returnDate,
      address,
      conversationId,
    } = customerData || {};

    if (
      !name ||
      !phone ||
      !email ||
      !instrument ||
      !rentDate ||
      !returnDate ||
      !address ||
      !conversationId
    ) {
      return res.json({ success: false, message: "All fields are required" });
    }

    // Check if enquiry with this conversationId already exists
    const existingEnquiry = await CustomerEnquiry.findOne({ conversationId });
    if (existingEnquiry) {
      return res.json({ success: false, message: "Enquiry already exists" });
    }

    // Create new enquiry
    const newEnquiry = new CustomerEnquiry({
      name,
      phone,
      email,
      instrument,
      rentDate,
      returnDate,
      address,
      conversationId,
      messages: messages || [],
    });

    await newEnquiry.save();

    res.json({
      success: true,
      message: "Enquiry saved successfully",
      enquiry: newEnquiry,
    });
  } catch (error) {
    console.error("Error saving enquiry:", error);
    res.json({ success: false, message: "Failed to save enquiry" });
  }
};

// Get all enquiries (Admin only)
export const getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await CustomerEnquiry.find()
      .sort({ createdAt: -1 })
      .select("-messages"); // Exclude messages for list view performance

    res.json({ success: true, enquiries });
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    res.json({ success: false, message: "Failed to fetch enquiries" });
  }
};

// Get single enquiry by ID (Admin only)
export const getEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiry = await CustomerEnquiry.findById(id);

    if (!enquiry) {
      return res.json({ success: false, message: "Enquiry not found" });
    }

    res.json({ success: true, enquiry });
  } catch (error) {
    console.error("Error fetching enquiry:", error);
    res.json({ success: false, message: "Failed to fetch enquiry" });
  }
};

// Update enquiry status (Admin only)
export const updateEnquiryStatus = async (req, res) => {
  try {
    const { enquiryId, status } = req.body;

    if (!["pending", "contacted", "completed"].includes(status)) {
      return res.json({ success: false, message: "Invalid status" });
    }

    const enquiry = await CustomerEnquiry.findByIdAndUpdate(
      enquiryId,
      { status },
      { new: true, runValidators: true }
    );

    if (!enquiry) {
      return res.json({ success: false, message: "Enquiry not found" });
    }

    res.json({ success: true, enquiry });
  } catch (error) {
    console.error("Error updating enquiry status:", error);
    res.json({ success: false, message: "Failed to update enquiry status" });
  }
};
