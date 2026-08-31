import mongoose from "mongoose";

const campSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    organizer: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true },
    venue: { type: String, required: true },
    city: { type: String, required: true, index: true },
    state: { type: String, default: "Maharashtra" },
    description: String,
    maxParticipants: { type: Number, default: 100 },
    registrations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Donor" }],
    registered: { type: Number, default: 0 },
    unitsCollected: { type: Number, default: 0 },
    contactPerson: String,
  },
  { timestamps: true },
);

export default mongoose.model("Camp", campSchema);
