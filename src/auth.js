import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ message: "Not authorized" });
  try {
    const { id } = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.user = await User.findById(id);
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export const authorize =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role) ? next() : res.status(403).json({ message: "Forbidden" });
