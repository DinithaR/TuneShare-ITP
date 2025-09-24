import mongoose from "mongoose";

const customerEnquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    instrument: { type: String, required: true },
    rentDate: { type: String, required: true },
    returnDate: { type: String, required: true },
    address: { type: String, required: true },
    conversationId: { type: String, required: true, unique: true },
    messages: [
      {
        type: { type: String, enum: ["user", "bot"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, required: true },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "contacted", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const CustomerEnquiry = mongoose.model(
  "CustomerEnquiry",
  customerEnquirySchema
);

export default CustomerEnquiry;
