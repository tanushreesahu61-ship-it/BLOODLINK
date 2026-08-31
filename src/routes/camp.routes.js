import { Router } from "express";
import Camp from "../models/Camp.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { scope, city } = req.query;
    const filter = {};
    if (city) filter.city = new RegExp(`^${city}$`, "i");
    if (scope === "upcoming") filter.date = { $gte: today };
    if (scope === "past") filter.date = { $lt: today };
    res.json(await Camp.find(filter).sort({ date: 1 }));
  } catch (e) {
    next(e);
  }
});

router.post("/", protect, authorize("hospital", "ngo", "admin"), async (req, res, next) => {
  try {
    res.status(201).json(await Camp.create({ ...req.body, createdBy: req.user._id }));
  } catch (e) {
    next(e);
  }
});

router.post("/:id/register", protect, async (req, res, next) => {
  try {
    const camp = await Camp.findById(req.params.id);
    if (!camp) return res.status(404).json({ message: "Camp not found" });
    if (camp.registered >= camp.maxParticipants)
      return res.status(400).json({ message: "Camp is full" });
    if (req.body.donorId && !camp.registrations.includes(req.body.donorId))
      camp.registrations.push(req.body.donorId);
    camp.registered = Math.min(camp.maxParticipants, camp.registered + 1);
    await camp.save();
    res.json(camp);
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", protect, authorize("hospital", "ngo", "admin"), async (req, res, next) => {
  try {
    res.json(await Camp.findByIdAndUpdate(req.params.id, req.body, { new: true }));
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", protect, authorize("hospital", "ngo", "admin"), async (req, res, next) => {
  try {
    await Camp.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
