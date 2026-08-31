import mongoose from "mongoose";
import { BLOOD_GROUPS } from "../lib/blood.js";

const donorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    age: { type: Number, required: true, min: 18, max: 65 },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true, index: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    city: { type: String, required: true, index: true },
    state: { type: String, default: "Maharashtra" },
    pincode: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    lastDonationDate: { type: Date, default: null },
    available: { type: Boolean, default: true },
    donations: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

donorSchema.index({ location: "2dsphere" });
donorSchema.virtual("lat").get(function () {
  return this.location?.coordinates?.[1];
});
donorSchema.virtual("lng").get(function () {
  return this.location?.coordinates?.[0];
});

export default mongoose.model("Donor", donorSchema);
