import { Router } from "express";
import Donor from "../models/Donor.js";
import Camp from "../models/Camp.js";
import BloodRequest from "../models/BloodRequest.js";
import { isEligible } from "../lib/blood.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const donors = await Donor.find().lean();
    const camps = await Camp.find().lean();

    res.json({
      totalDonors: donors.length,
      availableDonors: donors.filter((d) => d.available).length,
      eligibleDonors: donors.filter(isEligible).length,
      totalCamps: camps.length,
      upcomingCamps: camps.filter((c) => c.date >= today).length,
      unitsCollected: camps.reduce((s, c) => s + (c.unitsCollected || 0), 0),
      openRequests: await BloodRequest.countDocuments({ status: { $in: ["Pending", "Accepted"] } }),
      completedRequests: await BloodRequest.countDocuments({ status: "Completed" }),
      byBloodGroup: await Donor.aggregate([
        { $group: { _id: "$bloodGroup", donors: { $sum: 1 } } },
        { $project: { _id: 0, group: "$_id", donors: 1 } },
      ]),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
