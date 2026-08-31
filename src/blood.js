export const BLOOD_GROUPS = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

export const CAN_DONATE_TO = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

export const canReceiveFrom = (patient) =>
  BLOOD_GROUPS.filter((donor) => CAN_DONATE_TO[donor].includes(patient));

export const ELIGIBILITY_DAYS = 90;
const DAY = 86400000;

export const daysSince = (date) =>
  date ? Math.floor((Date.now() - new Date(date).getTime()) / DAY) : null;

export const isEligible = (donor) => {
  const d = daysSince(donor.lastDonationDate);
  return d === null || d >= ELIGIBILITY_DAYS;
};

/** Haversine distance in km. */
export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}
