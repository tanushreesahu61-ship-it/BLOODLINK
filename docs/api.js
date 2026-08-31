/**
 * Thin HTTP client for the BloodLink Express API.
 * Change API_BASE if the backend runs somewhere other than localhost:5000.
 */
const API_BASE = window.BLOODLINK_API_BASE || "http://localhost:5000/api";

let authToken = null; // kept in memory only — set on sign in, cleared on refresh
function setAuthToken(token) { authToken = token; }
function getAuthToken() { return authToken; }

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(`Could not reach the API at ${API_BASE}. Is the backend running?`);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

const api = {
  setAuthToken,
  getAuthToken,

  health: () => request("/health"),

  // auth
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: () => request("/auth/me", { auth: true }),

  // donors
  listDonors: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null)),
    ).toString();
    return request(`/donors${qs ? `?${qs}` : ""}`);
  },
  registerDonor: (payload) => request("/donors", { method: "POST", body: payload }),
  toggleDonorAvailability: (id) => request(`/donors/${id}/availability`, { method: "PATCH", auth: true }),

  // camps
  listCamps: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null)),
    ).toString();
    return request(`/camps${qs ? `?${qs}` : ""}`);
  },
  createCamp: (payload) => request("/camps", { method: "POST", body: payload, auth: true }),
  registerForCamp: (id, donorId) =>
    request(`/camps/${id}/register`, { method: "POST", body: { donorId }, auth: true }),

  // requests
  listRequests: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null)),
    ).toString();
    return request(`/requests${qs ? `?${qs}` : ""}`);
  },
  createRequest: (payload) => request("/requests", { method: "POST", body: payload }),
  updateRequestStatus: (id, status) =>
    request(`/requests/${id}/status`, { method: "PATCH", body: { status } }),

  // notifications
  listNotifications: (donorId) => request(`/notifications${donorId ? `?donorId=${donorId}` : ""}`),
  updateNotification: (id, status) => request(`/notifications/${id}`, { method: "PATCH", body: { status } }),

  // stats
  stats: () => request("/stats"),
};
