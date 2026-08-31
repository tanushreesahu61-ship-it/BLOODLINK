import { Router } from "express";
import Donor from "../models/Donor.js";
import { protect, authorize } from "../middleware/auth.js";
import { canReceiveFrom, isEligible, distanceKm } from "../lib/blood.js";

const router = Router();

/** GET /api/donors?bloodGroup=A+&compatible=true&city=Pune&pincode=&lat=&lng=&radius=25&available=true&eligible=true */
router.get("/", async (req, res, next) => {
  try {
    const { bloodGroup, compatible, city, pincode, lat, lng, radius, available, eligible } = req.query;
    const filter = {};

    if (bloodGroup) {
      filter.bloodGroup = compatible === "true" ? { $in: canReceiveFrom(bloodGroup) } : bloodGroup;
    }
    if (city) filter.city = new RegExp(`^${city}$`, "i");
    if (pincode) filter.pincode = pincode;
    if (available === "true") filter.available = true;

    let donors = await Donor.find(filter).lean({ virtuals: true });

    if (eligible === "true") donors = donors.filter(isEligible);

    if (lat && lng) {
      const origin = { lat: Number(lat), lng: Number(lng) };
      const max = Number(radius) || 25;
      donors = donors
        .map((d) => ({ ...d, distanceKm: distanceKm(origin, { lat: d.lat, lng: d.lng }) }))
        .filter((d) => d.distanceKm <= max)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    res.json({ count: donors.length, donors });
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { lat = 0, lng = 0, ...rest } = req.body;
    const donor = await Donor.create({ ...rest, location: { type: "Point", coordinates: [lng, lat] } });
    res.status(201).json(donor);
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    res.json(donor);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/availability", protect, async (req, res, next) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    donor.available = !donor.available;
    await donor.save();
    res.json(donor);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", protect, authorize("admin"), async (req, res, next) => {
  try {
    await Donor.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
