import mongoose from "mongoose";
import { BLOOD_GROUPS } from "../lib/blood.js";

const requestSchema = new mongoose.Schema(
  {
    patientName: { type: String, required: true },
    hospital: { type: String, required: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    units: { type: Number, required: true, min: 1 },
    city: { type: String, required: true },
    address: String,
    contact: { type: String, required: true },
    urgency: { type: String, enum: ["Critical", "High", "Normal"], default: "Normal" },
    notes: String,
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Completed", "Cancelled"],
      default: "Pending",
    },
    matchedDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Donor" }],
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("BloodRequest", requestSchema);
