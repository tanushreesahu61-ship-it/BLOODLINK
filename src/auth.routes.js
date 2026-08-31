import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = Router();
const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (await User.findOne({ email })) return res.status(409).json({ message: "Email in use" });
    const user = await User.create({ name, email, password, role, phone });
    res.status(201).json({ token: sign(user._id), user: { id: user._id, name, email, role: user.role } });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid credentials" });
    res.json({ token: sign(user._id), user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (e) {
    next(e);
  }
});

router.get("/me", protect, (req, res) => res.json({ user: req.user }));

export default router;
