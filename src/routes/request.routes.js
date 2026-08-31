import { Router } from "express";
import BloodRequest from "../models/BloodRequest.js";
import Donor from "../models/Donor.js";
import Notification from "../models/Notification.js";
import { canReceiveFrom, isEligible } from "../lib/blood.js";
import { sendEmail } from "../utils/mailer.js";

const router = Router();

/** GET /api/requests?status=Pending */
router.get("/", async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    res.json(await BloodRequest.find(filter).sort({ createdAt: -1 }).populate("matchedDonors"));
  } catch (e) {
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id).populate("matchedDonors");
    if (!request) return res.status(404).json({ message: "Request not found" });
    res.json(request);
  } catch (e) {
    next(e);
  }
});

/** POST /api/requests — creates a request and notifies compatible, eligible, available donors nearby. */
router.post("/", async (req, res, next) => {
  try {
    const request = await BloodRequest.create(req.body);

    const compatibleGroups = canReceiveFrom(request.bloodGroup);
    const candidates = await Donor.find({
      bloodGroup: { $in: compatibleGroups },
      city: new RegExp(`^${request.city}$`, "i"),
      available: true,
    });
    const matched = candidates.filter(isEligible);

    request.matchedDonors = matched.map((d) => d._id);
    await request.save();

    await Promise.all(
      matched.map(async (donor) => {
        await Notification.create({
          request: request._id,
          donor: donor._id,
          title: `Urgent: ${request.bloodGroup} blood needed`,
          message: `${request.hospital} in ${request.city} needs ${request.units} unit(s) of ${request.bloodGroup} for ${request.patientName}. Urgency: ${request.urgency}.`,
        });
        await sendEmail({
          to: donor.email,
          subject: `Urgent: ${request.bloodGroup} blood needed at ${request.hospital}`,
          text: `A patient at ${request.hospital} (${request.city}) needs ${request.units} unit(s) of ${request.bloodGroup}. Contact: ${request.contact}.`,
        });
      }),
    );

    res.status(201).json({ request, notified: matched.length });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    const request = await BloodRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!request) return res.status(404).json({ message: "Request not found" });
    res.json(request);
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await BloodRequest.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
