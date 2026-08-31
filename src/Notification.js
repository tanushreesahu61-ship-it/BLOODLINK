import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: "BloodRequest" },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "Donor" },
    title: String,
    message: String,
    status: { type: String, enum: ["Unread", "Accepted", "Declined"], default: "Unread" },
  },
  { timestamps: true },
);

export default mongoose.model("Notification", notificationSchema);
