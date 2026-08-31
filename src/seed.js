import "dotenv/config";
import mongoose from "mongoose";
import Donor from "./models/Donor.js";
import Camp from "./models/Camp.js";
import BloodRequest from "./models/BloodRequest.js";
import { BLOOD_GROUPS } from "./lib/blood.js";

const cities = [
  { city: "Nagpur", lat: 21.1458, lng: 79.0882 },
  { city: "Pune", lat: 18.5204, lng: 73.8567 },
  { city: "Mumbai", lat: 19.076, lng: 72.8777 },
  { city: "Nashik", lat: 19.9975, lng: 73.7898 },
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const names = ["Aarav", "Vivaan", "Isha", "Sneha", "Rohan", "Priya", "Kabir", "Anaya", "Rahul", "Meera"];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([Donor.deleteMany({}), Camp.deleteMany({}), BloodRequest.deleteMany({})]);

  const donors = Array.from({ length: 24 }).map((_, i) => {
    const loc = rand(cities);
    return {
      name: `${rand(names)} ${["Sharma", "Patil", "Verma", "Iyer"][i % 4]}`,
      age: 20 + (i % 30),
      gender: rand(["Male", "Female", "Other"]),
      bloodGroup: rand(BLOOD_GROUPS),
      phone: `98${String(10000000 + i).slice(0, 8)}`,
      email: `donor${i}@example.com`,
      city: loc.city,
      pincode: `4400${String(i).padStart(2, "0")}`,
      location: { type: "Point", coordinates: [loc.lng + Math.random() * 0.1, loc.lat + Math.random() * 0.1] },
      lastDonationDate: i % 3 === 0 ? new Date(Date.now() - 30 * 86400000) : null,
      available: i % 5 !== 0,
      donations: i % 6,
    };
  });
  await Donor.insertMany(donors);

  const today = new Date();
  const camps = Array.from({ length: 6 }).map((_, i) => {
    const loc = rand(cities);
    const d = new Date(today.getTime() + (i - 2) * 7 * 86400000);
    return {
      name: `${loc.city} Community Blood Drive`,
      organizer: rand(["Red Cross", "Rotary Club", "City Hospital", "Lions Club"]),
      date: d.toISOString().slice(0, 10),
      time: "10:00 AM - 4:00 PM",
      venue: `${loc.city} Community Hall`,
      city: loc.city,
      description: "Walk-ins welcome. Please carry a valid ID.",
      maxParticipants: 80,
      registered: 10 + i * 5,
      unitsCollected: i < 2 ? 40 + i * 5 : 0,
      contactPerson: "9876543210",
    };
  });
  await Camp.insertMany(camps);

  const requests = Array.from({ length: 5 }).map((_, i) => {
    const loc = rand(cities);
    return {
      patientName: rand(names),
      hospital: `${loc.city} General Hospital`,
      bloodGroup: rand(BLOOD_GROUPS),
      units: 1 + (i % 3),
      city: loc.city,
      contact: "9123456780",
      urgency: rand(["Critical", "High", "Normal"]),
      status: rand(["Pending", "Accepted", "Completed"]),
    };
  });
  await BloodRequest.insertMany(requests);

  console.log("Seeded:", donors.length, "donors,", camps.length, "camps,", requests.length, "requests");
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
