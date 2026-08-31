/* BloodLink SPA — vanilla JS, hash-routed, talks to the Express API via api.js */

const $app = document.getElementById("app");
const $modalRoot = document.getElementById("modalRoot");
const $apiStatus = document.getElementById("apiStatus");

const state = {
  user: null,          // { id, name, email, role } once signed in
  campScope: "upcoming",
  lastDonorId: null,   // remembered after registering, used to check notifications
};

const BLOOD_GROUPS = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

/* ---------------- routing ---------------- */
const routes = {
  "/": renderHome,
  "/donors": renderDonors,
  "/camps": renderCamps,
  "/emergency": renderEmergency,
  "/dashboard": renderDashboard,
};

function currentPath() {
  return (location.hash.replace(/^#/, "") || "/").split("?")[0];
}

async function router() {
  const path = currentPath();
  document.querySelectorAll(".nav-links a").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === path);
  });
  const render = routes[path] || renderHome;
  $app.innerHTML = `<div class="section"><p class="form-note">Loading…</p></div>`;
  try {
    await render();
  } catch (e) {
    $app.innerHTML = `<div class="section"><div class="empty-state">Something went wrong: ${esc(e.message)}</div></div>`;
  }
}

window.addEventListener("hashchange", router);

/* ---------------- API status pill ---------------- */
async function checkHealth() {
  try {
    await api.health();
    $apiStatus.textContent = "API connected";
    $apiStatus.className = "api-status ok";
  } catch {
    $apiStatus.textContent = "API unreachable — start the backend on :5000";
    $apiStatus.className = "api-status down";
  }
}

/* ---------------- modal helper ---------------- */
function openModal(title, bodyHtml, { onMount } = {}) {
  $modalRoot.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          <button class="modal-close" id="modalCloseBtn" aria-label="Close">&times;</button>
        </div>
        ${bodyHtml}
      </div>
    </div>`;
  const backdrop = document.getElementById("modalBackdrop");
  const close = () => { $modalRoot.innerHTML = ""; };
  document.getElementById("modalCloseBtn").addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  if (onMount) onMount(close);
}

/* ---------------- sign in ---------------- */
document.getElementById("btnSignIn").addEventListener("click", () => {
  if (state.user) return openAccountModal();
  openAuthModal();
});

function renderNavAuth() {
  const $navAuth = document.getElementById("navAuth");
  $navAuth.innerHTML = state.user
    ? `<button class="btn btn-ghost" id="btnSignIn">${esc(state.user.name.split(" ")[0])} · ${esc(state.user.role)}</button>`
    : `<button class="btn btn-ghost" id="btnSignIn">Sign in</button>`;
  document.getElementById("btnSignIn").addEventListener("click", () => {
    state.user ? openAccountModal() : openAuthModal();
  });
}

function openAuthModal() {
  openModal("Sign in to BloodLink", `
    <div class="tabs" id="authTabs">
      <button class="tab active" data-mode="login">Sign in</button>
      <button class="tab" data-mode="register">Create account</button>
    </div>
    <form id="authForm">
      <div class="form-grid">
        <div class="field full" id="fieldName" style="display:none">
          <label>Full name</label>
          <input name="name" type="text" placeholder="Dr. Anjali Rao" />
        </div>
        <div class="field full">
          <label>Email</label>
          <input name="email" type="email" required placeholder="you@hospital.org" />
        </div>
        <div class="field full">
          <label>Password</label>
          <input name="password" type="password" required minlength="6" />
        </div>
        <div class="field full" id="fieldRole" style="display:none">
          <label>Account type</label>
          <select name="role">
            <option value="hospital">Hospital</option>
            <option value="ngo">NGO / camp organizer</option>
            <option value="donor">Donor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <p class="form-note">Hospital and NGO accounts can host camps and manage requests.</p>
      <div id="authMsg"></div>
      <div class="card-actions" style="margin-top:16px">
        <button type="submit" class="btn btn-primary">Continue</button>
      </div>
    </form>
  `, {
    onMount: (close) => {
      let mode = "login";
      const tabs = document.querySelectorAll("#authTabs .tab");
      tabs.forEach((t) => t.addEventListener("click", () => {
        mode = t.dataset.mode;
        tabs.forEach((x) => x.classList.toggle("active", x === t));
        document.getElementById("fieldName").style.display = mode === "register" ? "block" : "none";
        document.getElementById("fieldRole").style.display = mode === "register" ? "block" : "none";
      }));

      document.getElementById("authForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        const $msg = document.getElementById("authMsg");
        try {
          const data = mode === "login" ? await api.login(payload) : await api.register(payload);
          api.setAuthToken(data.token);
          state.user = data.user;
          renderNavAuth();
          close();
        } catch (err) {
          $msg.innerHTML = `<div class="form-msg err">${esc(err.message)}</div>`;
        }
      });
    },
  });
}

function openAccountModal() {
  openModal("Account", `
    <p><strong>${esc(state.user.name)}</strong></p>
    <p class="form-note">${esc(state.user.email)} · ${esc(state.user.role)}</p>
    <div class="card-actions" style="margin-top:16px">
      <button class="btn btn-dark" id="btnSignOut">Sign out</button>
    </div>
  `, {
    onMount: (close) => {
      document.getElementById("btnSignOut").addEventListener("click", () => {
        state.user = null;
        api.setAuthToken(null);
        renderNavAuth();
        close();
      });
    },
  });
}

/* ================= HOME ================= */
async function renderHome() {
  let stats = null;
  try { stats = await api.stats(); } catch { /* backend may be offline */ }

  $app.innerHTML = `
    <section class="hero">
      <div>
        <div class="hero-eyebrow">Community blood donor network</div>
        <h1>Every donor is a <em>heartbeat</em> for someone else.</h1>
        <p>Find compatible donors nearby, register for donation camps, and raise emergency
           requests that reach eligible donors within minutes.</p>
        <div class="hero-cta">
          <a class="btn btn-primary" href="#/emergency">Raise an emergency request</a>
          <a class="btn btn-ghost" href="#/donors">Find a donor</a>
        </div>
      </div>
      <div class="pulse-card">
        <svg viewBox="0 0 300 60" preserveAspectRatio="none">
          <polyline points="0,30 70,30 88,8 106,52 124,30 300,30"/>
        </svg>
        <p class="form-note" style="margin-top:8px">Live network pulse — updated from real donor and request data.</p>
      </div>
    </section>

    <section class="stat-grid">
      ${statCard(stats?.totalDonors, "Registered donors")}
      ${statCard(stats?.availableDonors, "Available right now")}
      ${statCard(stats?.upcomingCamps, "Upcoming camps")}
      ${statCard(stats?.openRequests, "Open requests")}
    </section>
  `;

  if (!stats) {
    $app.insertAdjacentHTML("beforeend", `<div class="section"><div class="empty-state">Live stats need the backend running on :5000.</div></div>`);
  }
}

function statCard(value, label) {
  return `<div class="stat-card"><div class="num">${value ?? "—"}</div><div class="label">${esc(label)}</div></div>`;
}

/* ================= DONORS ================= */
async function renderDonors() {
  $app.innerHTML = `
    <div class="page-head">
      <h2>Donor directory</h2>
      <p>Filter by blood group, compatibility, location, and availability.</p>
    </div>
    <div class="section">
      <div class="filter-bar" id="donorFilters">
        <div class="filter-field">
          <label>Blood group</label>
          <select name="bloodGroup"><option value="">Any</option>${BLOOD_GROUPS.map((g) => `<option value="${g}">${g}</option>`).join("")}</select>
        </div>
        <div class="filter-field">
          <label>Match mode</label>
          <select name="compatible"><option value="false">Exact group</option><option value="true">Compatible donors</option></select>
        </div>
        <div class="filter-field">
          <label>City</label>
          <input name="city" type="text" placeholder="e.g. Nagpur" />
        </div>
        <div class="filter-field">
          <label>Pincode</label>
          <input name="pincode" type="text" placeholder="440001" />
        </div>
        <div class="filter-field">
          <label>Available only</label>
          <select name="available"><option value="">Any</option><option value="true">Yes</option></select>
        </div>
        <div class="filter-field">
          <label>Eligible only (90+ days)</label>
          <select name="eligible"><option value="">Any</option><option value="true">Yes</option></select>
        </div>
        <div class="filter-spacer"></div>
        <button class="btn btn-primary btn-sm" id="btnApplyFilters" style="align-self:flex-end">Apply</button>
        <button class="btn btn-ghost btn-sm" id="btnRegisterDonor" style="align-self:flex-end">Register as donor</button>
      </div>
      <div id="donorResults" class="card-grid"></div>
    </div>
  `;

  document.getElementById("btnApplyFilters").addEventListener("click", loadDonors);
  document.getElementById("btnRegisterDonor").addEventListener("click", openRegisterDonorModal);
  await loadDonors();
}

async function loadDonors() {
  const $results = document.getElementById("donorResults");
  $results.innerHTML = `<p class="form-note">Loading donors…</p>`;
  const form = document.getElementById("donorFilters");
  const fd = new FormData(form);
  const params = Object.fromEntries(fd.entries());

  try {
    const { donors, count } = await api.listDonors(params);
    if (!count) {
      $results.innerHTML = `<div class="empty-state">No donors match those filters yet.</div>`;
      return;
    }
    $results.innerHTML = donors.map(donorCard).join("");
    $results.querySelectorAll("[data-toggle-id]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        try {
          await api.toggleDonorAvailability(btn.dataset.toggleId);
          await loadDonors();
        } catch (e) {
          alert(e.message + (state.user ? "" : " — sign in first."));
        }
      }),
    );
  } catch (e) {
    $results.innerHTML = `<div class="empty-state">${esc(e.message)}</div>`;
  }
}

function donorCard(d) {
  const dist = d.distanceKm != null ? `<span class="pill pill-muted">${d.distanceKm.toFixed(1)} km away</span>` : "";
  return `
    <div class="card">
      <div class="card-top">
        <span class="group-badge">${esc(d.bloodGroup)}</span>
        <span class="pill ${d.available ? "pill-ok" : "pill-muted"}">${d.available ? "Available" : "Not available"}</span>
      </div>
      <h3>${esc(d.name)}</h3>
      <div class="meta">${esc(d.city)} · ${esc(d.pincode)} ${dist}</div>
      <div class="meta">${esc(d.phone)} · ${esc(d.email)}</div>
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm" data-toggle-id="${d._id}">Toggle availability</button>
      </div>
    </div>`;
}

function openRegisterDonorModal() {
  openModal("Register as a donor", `
    <form id="donorForm">
      <div class="form-grid">
        <div class="field"><label>Full name</label><input name="name" required /></div>
        <div class="field"><label>Age</label><input name="age" type="number" min="18" max="65" required /></div>
        <div class="field">
          <label>Gender</label>
          <select name="gender"><option>Male</option><option>Female</option><option>Other</option></select>
        </div>
        <div class="field">
          <label>Blood group</label>
          <select name="bloodGroup">${BLOOD_GROUPS.map((g) => `<option value="${g}">${g}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Phone</label><input name="phone" required /></div>
        <div class="field"><label>Email</label><input name="email" type="email" required /></div>
        <div class="field"><label>City</label><input name="city" required /></div>
        <div class="field"><label>Pincode</label><input name="pincode" required /></div>
      </div>
      <p class="form-note">Location coordinates default to 0,0 — hook up a geocoding step later if you need distance search from real addresses.</p>
      <div id="donorFormMsg"></div>
      <div class="card-actions" style="margin-top:16px">
        <button type="submit" class="btn btn-primary">Register</button>
      </div>
    </form>
  `, {
    onMount: (close) => {
      document.getElementById("donorForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        payload.age = Number(payload.age);
        const $msg = document.getElementById("donorFormMsg");
        try {
          const donor = await api.registerDonor(payload);
          state.lastDonorId = donor._id;
          $msg.innerHTML = `<div class="form-msg ok">Registered! Thank you — you're now in the directory.</div>`;
          setTimeout(async () => { close(); await loadDonors(); }, 700);
        } catch (err) {
          $msg.innerHTML = `<div class="form-msg err">${esc(err.message)}</div>`;
        }
      });
    },
  });
}

/* ================= CAMPS ================= */
async function renderCamps() {
  $app.innerHTML = `
    <div class="page-head">
      <h2>Donation camps</h2>
      <p>Browse upcoming drives or look back at past collections.</p>
    </div>
    <div class="section">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div class="tabs" id="campTabs">
          <button class="tab ${state.campScope === "upcoming" ? "active" : ""}" data-scope="upcoming">Upcoming</button>
          <button class="tab ${state.campScope === "past" ? "active" : ""}" data-scope="past">Past</button>
        </div>
        <button class="btn btn-primary btn-sm" id="btnHostCamp">Host a camp</button>
      </div>
      <div id="campResults" class="card-grid" style="margin-top:20px"></div>
    </div>
  `;

  document.querySelectorAll("#campTabs .tab").forEach((t) =>
    t.addEventListener("click", async () => {
      state.campScope = t.dataset.scope;
      document.querySelectorAll("#campTabs .tab").forEach((x) => x.classList.toggle("active", x === t));
      await loadCamps();
    }),
  );
  document.getElementById("btnHostCamp").addEventListener("click", openHostCampModal);
  await loadCamps();
}

async function loadCamps() {
  const $results = document.getElementById("campResults");
  $results.innerHTML = `<p class="form-note">Loading camps…</p>`;
  try {
    const camps = await api.listCamps({ scope: state.campScope });
    if (!camps.length) {
      $results.innerHTML = `<div class="empty-state">No ${esc(state.campScope)} camps yet.</div>`;
      return;
    }
    $results.innerHTML = camps.map(campCard).join("");
    $results.querySelectorAll("[data-register-camp]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        try {
          await api.registerForCamp(btn.dataset.registerCamp, state.lastDonorId);
          await loadCamps();
        } catch (e) {
          alert(e.message + (state.user ? "" : " — sign in first."));
        }
      }),
    );
  } catch (e) {
    $results.innerHTML = `<div class="empty-state">${esc(e.message)}</div>`;
  }
}

function campCard(c) {
  const full = c.registered >= c.maxParticipants;
  return `
    <div class="card">
      <div class="card-top">
        <span class="pill pill-muted">${esc(c.date)}</span>
        <span class="pill ${full ? "pill-warn" : "pill-ok"}">${c.registered}/${c.maxParticipants}</span>
      </div>
      <h3>${esc(c.name)}</h3>
      <div class="meta">${esc(c.venue)}, ${esc(c.city)}</div>
      <div class="meta">${esc(c.time)} · hosted by ${esc(c.organizer)}</div>
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm" data-register-camp="${c._id}" ${full ? "disabled" : ""}>Register</button>
      </div>
    </div>`;
}

function openHostCampModal() {
  openModal("Host a donation camp", `
    <form id="campForm">
      <div class="form-grid">
        <div class="field full"><label>Camp name</label><input name="name" required /></div>
        <div class="field"><label>Organizer</label><input name="organizer" required /></div>
        <div class="field"><label>Contact person / phone</label><input name="contactPerson" /></div>
        <div class="field"><label>Date</label><input name="date" type="date" required /></div>
        <div class="field"><label>Time window</label><input name="time" placeholder="10:00 AM - 4:00 PM" required /></div>
        <div class="field"><label>Venue</label><input name="venue" required /></div>
        <div class="field"><label>City</label><input name="city" required /></div>
        <div class="field"><label>Max participants</label><input name="maxParticipants" type="number" value="100" /></div>
        <div class="field full"><label>Description</label><textarea name="description"></textarea></div>
      </div>
      <p class="form-note">Hosting requires a hospital, NGO, or admin account — sign in first.</p>
      <div id="campFormMsg"></div>
      <div class="card-actions" style="margin-top:16px">
        <button type="submit" class="btn btn-primary" ${state.user ? "" : "disabled"}>Create camp</button>
        ${state.user ? "" : `<button type="button" class="btn btn-ghost" id="campSignInBtn">Sign in</button>`}
      </div>
    </form>
  `, {
    onMount: (close) => {
      document.getElementById("campSignInBtn")?.addEventListener("click", () => { close(); openAuthModal(); });
      document.getElementById("campForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!state.user) return;
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        payload.maxParticipants = Number(payload.maxParticipants) || 100;
        const $msg = document.getElementById("campFormMsg");
        try {
          await api.createCamp(payload);
          $msg.innerHTML = `<div class="form-msg ok">Camp created.</div>`;
          setTimeout(async () => { close(); await loadCamps(); }, 700);
        } catch (err) {
          $msg.innerHTML = `<div class="form-msg err">${esc(err.message)}</div>`;
        }
      });
    },
  });
}

/* ================= EMERGENCY ================= */
async function renderEmergency() {
  $app.innerHTML = `
    <div class="page-head">
      <h2>Emergency blood request</h2>
      <p>Requests instantly match against eligible, available, compatible donors in the same city.</p>
    </div>
    <div class="section two-col">
      <div class="panel">
        <h3>Raise a request</h3>
        <form id="reqForm">
          <div class="form-grid">
            <div class="field"><label>Patient name</label><input name="patientName" required /></div>
            <div class="field"><label>Hospital</label><input name="hospital" required /></div>
            <div class="field">
              <label>Blood group needed</label>
              <select name="bloodGroup">${BLOOD_GROUPS.map((g) => `<option value="${g}">${g}</option>`).join("")}</select>
            </div>
            <div class="field"><label>Units</label><input name="units" type="number" min="1" value="1" required /></div>
            <div class="field"><label>City</label><input name="city" required /></div>
            <div class="field">
              <label>Urgency</label>
              <select name="urgency"><option>Critical</option><option>High</option><option selected>Normal</option></select>
            </div>
            <div class="field full"><label>Address</label><input name="address" /></div>
            <div class="field full"><label>Contact number</label><input name="contact" required /></div>
            <div class="field full"><label>Notes</label><textarea name="notes"></textarea></div>
          </div>
          <div id="reqFormMsg"></div>
          <div class="card-actions" style="margin-top:16px">
            <button type="submit" class="btn btn-primary">Submit request</button>
          </div>
        </form>
      </div>
      <div class="panel">
        <h3>Donor notifications</h3>
        <p class="form-note">Enter the donor ID you were given after registering to see matched requests.</p>
        <div class="field" style="margin-bottom:10px">
          <input id="donorIdInput" placeholder="Donor ID" value="${esc(state.lastDonorId || "")}" />
        </div>
        <button class="btn btn-ghost btn-sm" id="btnLoadNotifs">Check notifications</button>
        <div id="notifList" style="margin-top:16px"></div>
      </div>
    </div>
  `;

  document.getElementById("reqForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    payload.units = Number(payload.units);
    const $msg = document.getElementById("reqFormMsg");
    try {
      const { notified } = await api.createRequest(payload);
      $msg.innerHTML = `<div class="form-msg ok">Request submitted — ${notified} matching donor(s) notified.</div>`;
      e.target.reset();
    } catch (err) {
      $msg.innerHTML = `<div class="form-msg err">${esc(err.message)}</div>`;
    }
  });

  document.getElementById("btnLoadNotifs").addEventListener("click", async () => {
    const donorId = document.getElementById("donorIdInput").value.trim();
    const $list = document.getElementById("notifList");
    $list.innerHTML = `<p class="form-note">Loading…</p>`;
    try {
      const notifs = await api.listNotifications(donorId);
      $list.innerHTML = notifs.length
        ? notifs.map((n) => `
            <div class="notif-item">
              <h4>${esc(n.title)}</h4>
              <p>${esc(n.message)}</p>
              <span class="pill ${n.status === "Unread" ? "pill-warn" : "pill-ok"}">${esc(n.status)}</span>
            </div>`).join("")
        : `<div class="empty-state">No notifications for this donor yet.</div>`;
    } catch (err) {
      $list.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
    }
  });
}

/* ================= DASHBOARD ================= */
async function renderDashboard() {
  $app.innerHTML = `
    <div class="page-head">
      <h2>Dashboard</h2>
      <p>Network-wide metrics pulled live from the API.</p>
    </div>
    <div class="section" id="dashSection"><p class="form-note">Loading dashboard…</p></div>
  `;

  const $section = document.getElementById("dashSection");
  try {
    const [stats, requests] = await Promise.all([api.stats(), api.listRequests()]);

    const maxDonors = Math.max(1, ...stats.byBloodGroup.map((g) => g.donors));
    const byGroupRows = BLOOD_GROUPS.map((g) => {
      const row = stats.byBloodGroup.find((x) => x.group === g);
      const n = row?.donors || 0;
      return `<div class="bar-row"><span>${g}</span><div class="bar-track"><div class="bar-fill" style="width:${(n / maxDonors) * 100}%"></div></div><span>${n}</span></div>`;
    }).join("");

    $section.innerHTML = `
      <div class="stat-grid" style="margin-top:0">
        ${statCard(stats.totalDonors, "Total donors")}
        ${statCard(stats.eligibleDonors, "Eligible donors")}
        ${statCard(stats.unitsCollected, "Units collected")}
        ${statCard(stats.completedRequests, "Requests completed")}
      </div>
      <div class="dash-grid" style="margin-top:24px">
        <div class="panel">
          <h3>Donors by blood group</h3>
          ${byGroupRows}
        </div>
        <div class="panel">
          <h3>Request pipeline</h3>
          <div class="bar-row"><span>Open</span><div class="bar-track"><div class="bar-fill" style="width:${pct(stats.openRequests, stats.openRequests + stats.completedRequests)}%"></div></div><span>${stats.openRequests}</span></div>
          <div class="bar-row"><span>Done</span><div class="bar-track"><div class="bar-fill" style="width:${pct(stats.completedRequests, stats.openRequests + stats.completedRequests)}%"></div></div><span>${stats.completedRequests}</span></div>
        </div>
      </div>
      <div class="panel">
        <h3>Recent requests</h3>
        <table class="data-table">
          <thead><tr><th>Patient</th><th>Hospital</th><th>Group</th><th>Units</th><th>City</th><th>Urgency</th><th>Status</th></tr></thead>
          <tbody>
            ${requests.slice(0, 12).map((r) => `
              <tr>
                <td>${esc(r.patientName)}</td>
                <td>${esc(r.hospital)}</td>
                <td>${esc(r.bloodGroup)}</td>
                <td>${r.units}</td>
                <td>${esc(r.city)}</td>
                <td><span class="pill ${r.urgency === "Critical" ? "pill-crit" : r.urgency === "High" ? "pill-warn" : "pill-muted"}">${esc(r.urgency)}</span></td>
                <td><span class="pill ${r.status === "Completed" ? "pill-ok" : "pill-muted"}">${esc(r.status)}</span></td>
              </tr>`).join("")}
          </tbody>
        </table>
        ${requests.length ? "" : `<div class="empty-state">No requests yet.</div>`}
      </div>
    `;
  } catch (e) {
    $section.innerHTML = `<div class="empty-state">${esc(e.message)}</div>`;
  }
}

function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }

/* ---------------- boot ---------------- */
renderNavAuth();
checkHealth();
router();
