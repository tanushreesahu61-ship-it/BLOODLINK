import { Router } from "express";
import Notification from "../models/Notification.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const filter = req.query.donorId ? { donor: req.query.donorId } : {};
    res.json(await Notification.find(filter).sort({ createdAt: -1 }).populate("request"));
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    res.json(
      await Notification.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }),
    );
  } catch (e) {
    next(e);
  }
});

export default router;
