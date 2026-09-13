const API = "/api";
const content = document.getElementById("content");
const viewTitle = document.getElementById("view-title");
const viewSubtitle = document.getElementById("view-subtitle");
const toastEl = document.getElementById("toast");

const VIEW_META = {
  dashboard:   { title: "Operations Dashboard", sub: "Live composite view across all active expeditions" },
  expeditions: { title: "Expedition Planning", sub: "Routes, resourcing, and status for every planned or active expedition" },
  cargo:       { title: "Cargo Tracking", sub: "Manifest status from staging to final delivery" },
  inventory:   { title: "Inventory Management", sub: "Live stock levels across every camp and depot" },
  personnel:   { title: "Personnel Movement", sub: "Location, check-in status, and rosters across all field teams" },
  emergency:   { title: "Emergency Response", sub: "Declare and coordinate incident response in real time" },
};

let currentView = "dashboard";

// ---------- utilities ----------
async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  if (res.status === 204) return null;
  return res.json();
}

function showToast(msg, alert = false) {
  toastEl.textContent = msg;
  toastEl.className = "toast show" + (alert ? " alert" : "");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toastEl.className = "toast"), 3200);
}

function fmtTime(iso) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const STATUS_BADGE = {
  planning: "badge--info", active: "badge--ok", completed: "badge--muted",
  staged: "badge--muted", "in-transit": "badge--info", delivered: "badge--ok", delayed: "badge--alert",
  "in-camp": "badge--ok", "en-route": "badge--info", overdue: "badge--alert", incident: "badge--alert",
  open: "badge--alert", resolved: "badge--ok",
};
function badge(status) {
  const cls = STATUS_BADGE[status] || "badge--muted";
  return `<span class="badge ${cls}">${status.replace("-", " ")}</span>`;
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ---------- nav ----------
document.getElementById("nav").addEventListener("click", (e) => {
  const btn = e.target.closest(".rail-link");
  if (!btn) return;
  document.querySelectorAll(".rail-link").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  currentView = btn.dataset.view;
  render();
});

function setHeader(view) {
  viewTitle.textContent = VIEW_META[view].title;
  viewSubtitle.textContent = VIEW_META[view].sub;
}

// ---------- clock ----------
function tickClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toUTCString().slice(17, 25) + " UTC";
}
setInterval(tickClock, 1000);
tickClock();

// ---------- render dispatcher ----------
async function render() {
  setHeader(currentView);
  content.innerHTML = `<div class="text-low mono">Loading\u2026</div>`;
  try {
    if (currentView === "dashboard") await renderDashboard();
    else if (currentView === "expeditions") await renderExpeditions();
    else if (currentView === "cargo") await renderCargo();
    else if (currentView === "inventory") await renderInventory();
    else if (currentView === "personnel") await renderPersonnel();
    else if (currentView === "emergency") await renderEmergency();
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><strong>Something went wrong</strong>${err.message}</div>`;
  }
}

// ============================================================
// DASHBOARD
// ============================================================
async function renderDashboard() {
  const [d, expeditions] = await Promise.all([api("/dashboard"), api("/expeditions")]);
  const c = d.counts;

  content.innerHTML = "";
  const statGrid = el(`<div class="grid grid--4"></div>`);
  statGrid.append(
    statCard("Active Expeditions", c.activeExpeditions, `${c.expeditions} total planned`),
    statCard("Cargo In Transit", c.cargoInTransit, `${c.cargoDelayed} delayed`, c.cargoDelayed > 0 ? "warn" : ""),
    statCard("Low Stock Alerts", c.lowStockCount, `across ${c.inventoryLocations} locations`, c.lowStockCount > 0 ? "warn" : ""),
    statCard("Open Incidents", c.openIncidentsCount, `${c.overduePersonnelCount} personnel overdue`, c.openIncidentsCount > 0 ? "alert" : "")
  );
  content.appendChild(statGrid);

  const lower = el(`<div class="grid grid--2 section-gap"></div>`);

  const expPanel = el(`<div class="card"><div class="panel-title">Active &amp; Upcoming Expeditions</div></div>`);
  const expTable = el(`<table><thead><tr><th>Expedition</th><th>Region</th><th>Status</th><th>Window</th></tr></thead><tbody></tbody></table>`);
  expeditions.forEach((e) => {
    expTable.querySelector("tbody").appendChild(el(`
      <tr>
        <td class="strong">${e.name}</td>
        <td>${e.region}</td>
        <td>${badge(e.status)}</td>
        <td class="mono">${e.startDate} \u2192 ${e.endDate}</td>
      </tr>`));
  });
  expPanel.appendChild(expTable);
  lower.appendChild(expPanel);

  const alertPanel = el(`<div class="card"><div class="panel-title">Attention Required</div></div>`);
  if (c.openIncidentsCount === 0 && c.lowStockCount === 0 && c.overduePersonnelCount === 0) {
    alertPanel.appendChild(el(`<div class="empty-state"><strong>All clear</strong>No open incidents, shortfalls, or overdue check-ins.</div>`));
  } else {
    const list = el(`<div></div>`);
    d.openIncidents.forEach((i) => list.appendChild(alertRow("alert", `Incident ${i.id}: ${i.type}`, timeAgo(i.declaredAt))));
    d.overduePersonnel.forEach((p) => list.appendChild(alertRow("alert", `${p.name} \u2014 overdue check-in`, timeAgo(p.lastCheckIn))));
    d.lowStock.forEach((i) => list.appendChild(alertRow("warn", `${i.item} low at ${i.location}`, `${i.quantity} ${i.unit} left`)));
    alertPanel.appendChild(list);
  }
  lower.appendChild(alertPanel);

  content.appendChild(lower);
}

function statCard(label, value, sub, tone = "") {
  return el(`
    <div class="card stat-card">
      <p class="stat-label">${label}</p>
      <div class="stat-value ${tone}">${value}</div>
      <p class="stat-sub">${sub}</p>
    </div>`);
}
function alertRow(tone, text, meta) {
  return el(`
    <div class="flex-between" style="padding:9px 0;border-bottom:1px solid var(--navy-800)">
      <span style="font-size:13px;color:var(--text-hi)"><span class="dot dot--${tone === "alert" ? "alert" : "warn"}" style="margin-right:8px"></span>${text}</span>
      <span class="mono text-low" style="font-size:11.5px">${meta}</span>
    </div>`);
}

// ============================================================
// EXPEDITIONS
// ============================================================
async function renderExpeditions() {
  const items = await api("/expeditions");
  content.innerHTML = "";
  content.appendChild(addFormCard("New Expedition Plan", [
    { name: "name", label: "Expedition Name", required: true },
    { name: "region", label: "Region", required: true },
    { name: "leader", label: "Expedition Leader" },
    { name: "teamSize", label: "Team Size", type: "number" },
    { name: "startDate", label: "Start Date", type: "date" },
    { name: "endDate", label: "End Date", type: "date" },
    { name: "status", label: "Status", type: "select", options: ["planning", "active", "completed"], default: "planning" },
    { name: "notes", label: "Notes", type: "textarea", full: true },
  ], async (data) => {
    data.teamSize = Number(data.teamSize) || 0;
    await api("/expeditions", { method: "POST", body: JSON.stringify(data) });
    showToast("Expedition plan created.");
    renderExpeditions();
  }));

  const panel = el(`<div class="card section-gap"><div class="panel-title">All Expeditions (${items.length})</div></div>`);
  const table = el(`<table><thead><tr><th>ID</th><th>Name</th><th>Region</th><th>Leader</th><th>Team</th><th>Window</th><th>Status</th></tr></thead><tbody></tbody></table>`);
  items.forEach((e) => {
    table.querySelector("tbody").appendChild(el(`
      <tr>
        <td class="mono text-low">${e.id}</td>
        <td class="strong">${e.name}</td>
        <td>${e.region}</td>
        <td>${e.leader || "\u2014"}</td>
        <td class="mono">${e.teamSize ?? "\u2014"}</td>
        <td class="mono">${e.startDate} \u2192 ${e.endDate}</td>
        <td>${statusSelect("expeditions", e.id, e.status, ["planning", "active", "completed"])}</td>
      </tr>`));
  });
  panel.appendChild(table);
  content.appendChild(panel);
}

// ============================================================
// CARGO
// ============================================================
async function renderCargo() {
  const [items, expeditions] = await Promise.all([api("/cargo"), api("/expeditions")]);
  content.innerHTML = "";
  content.appendChild(addFormCard("Log New Cargo Manifest", [
    { name: "description", label: "Description", required: true, full: true },
    { name: "expeditionId", label: "Expedition", type: "select", options: expeditions.map((e) => [e.id, e.name]) },
    { name: "origin", label: "Origin" },
    { name: "destination", label: "Destination" },
    { name: "weightKg", label: "Weight (kg)", type: "number" },
    { name: "status", label: "Status", type: "select", options: ["staged", "in-transit", "delivered", "delayed"], default: "staged" },
  ], async (data) => {
    data.weightKg = Number(data.weightKg) || 0;
    await api("/cargo", { method: "POST", body: JSON.stringify(data) });
    showToast("Cargo manifest logged.");
    renderCargo();
  }));

  const panel = el(`<div class="card section-gap"><div class="panel-title">All Cargo (${items.length})</div></div>`);
  const table = el(`<table><thead><tr><th>ID</th><th>Description</th><th>Route</th><th>Weight</th><th>Expedition</th><th>Status</th></tr></thead><tbody></tbody></table>`);
  items.forEach((c) => {
    const exp = expeditions.find((e) => e.id === c.expeditionId);
    table.querySelector("tbody").appendChild(el(`
      <tr>
        <td class="mono text-low">${c.id}</td>
        <td class="strong">${c.description}</td>
        <td style="font-size:12.5px">${c.origin || "\u2014"} <span class="text-low">\u2192</span> ${c.destination || "\u2014"}</td>
        <td class="mono">${c.weightKg ? c.weightKg + " kg" : "\u2014"}</td>
        <td>${exp ? exp.name : "\u2014"}</td>
        <td>${statusSelect("cargo", c.id, c.status, ["staged", "in-transit", "delivered", "delayed"])}</td>
      </tr>`));
  });
  panel.appendChild(table);
  content.appendChild(panel);
}

// ============================================================
// INVENTORY
// ============================================================
async function renderInventory() {
  const items = await api("/inventory");
  content.innerHTML = "";
  content.appendChild(addFormCard("Add Inventory Item", [
    { name: "item", label: "Item", required: true },
    { name: "category", label: "Category", type: "select", options: ["Fuel", "Food", "Medical", "Safety Equipment", "Other"] },
    { name: "location", label: "Location", required: true },
    { name: "quantity", label: "Quantity", type: "number" },
    { name: "unit", label: "Unit" },
    { name: "reorderLevel", label: "Reorder Level", type: "number" },
  ], async (data) => {
    data.quantity = Number(data.quantity) || 0;
    data.reorderLevel = Number(data.reorderLevel) || 0;
    await api("/inventory", { method: "POST", body: JSON.stringify(data) });
    showToast("Inventory item added.");
    renderInventory();
  }));

  const panel = el(`<div class="card section-gap"><div class="panel-title">All Inventory (${items.length})</div></div>`);
  const table = el(`<table><thead><tr><th>Item</th><th>Category</th><th>Location</th><th>Quantity</th><th>Reorder Level</th><th>Status</th></tr></thead><tbody></tbody></table>`);
  items.forEach((i) => {
    const low = i.quantity <= i.reorderLevel;
    table.querySelector("tbody").appendChild(el(`
      <tr>
        <td class="strong">${i.item}</td>
        <td>${i.category || "\u2014"}</td>
        <td>${i.location}</td>
        <td class="mono">${i.quantity} ${i.unit || ""}</td>
        <td class="mono text-low">${i.reorderLevel} ${i.unit || ""}</td>
        <td>${low ? badge("delayed").replace(">delayed<", ">low stock<") : badge("delivered").replace(">delivered<", ">ok<")}</td>
      </tr>`));
  });
  panel.appendChild(table);
  content.appendChild(panel);
}

// ============================================================
// PERSONNEL
// ============================================================
async function renderPersonnel() {
  const [items, expeditions] = await Promise.all([api("/personnel"), api("/expeditions")]);
  content.innerHTML = "";
  content.appendChild(addFormCard("Add Personnel Record", [
    { name: "name", label: "Name", required: true },
    { name: "role", label: "Role" },
    { name: "expeditionId", label: "Expedition", type: "select", options: expeditions.map((e) => [e.id, e.name]) },
    { name: "location", label: "Current Location" },
    { name: "status", label: "Status", type: "select", options: ["in-camp", "en-route", "overdue"], default: "in-camp" },
  ], async (data) => {
    data.lastCheckIn = new Date().toISOString();
    await api("/personnel", { method: "POST", body: JSON.stringify(data) });
    showToast("Personnel record added.");
    renderPersonnel();
  }));

  const panel = el(`<div class="card section-gap"><div class="panel-title">All Personnel (${items.length})</div></div>`);
  const table = el(`<table><thead><tr><th>Name</th><th>Role</th><th>Expedition</th><th>Location</th><th>Last Check-in</th><th>Status</th></tr></thead><tbody></tbody></table>`);
  items.forEach((p) => {
    const exp = expeditions.find((e) => e.id === p.expeditionId);
    table.querySelector("tbody").appendChild(el(`
      <tr>
        <td class="strong">${p.name}</td>
        <td>${p.role || "\u2014"}</td>
        <td>${exp ? exp.name : "\u2014"}</td>
        <td style="font-size:12.5px">${p.location || "\u2014"}</td>
        <td class="mono text-low" title="${p.lastCheckIn || ""}">${p.lastCheckIn ? timeAgo(p.lastCheckIn) : "\u2014"}</td>
        <td>${statusSelect("personnel", p.id, p.status, ["in-camp", "en-route", "overdue", "incident"])}</td>
      </tr>`));
  });
  panel.appendChild(table);
  content.appendChild(panel);
}

// ============================================================
// EMERGENCY
// ============================================================
async function renderEmergency() {
  const [incidents, personnel] = await Promise.all([api("/incidents"), api("/personnel")]);
  content.innerHTML = "";

  const banner = el(`
    <div class="emergency-banner">
      <div>
        <h3>Declare an Incident</h3>
        <p>Immediately surfaces last known position, nearby personnel, and nearby medical/safety assets for the affected person.</p>
      </div>
    </div>`);
  content.appendChild(banner);

  content.appendChild(addFormCard("Incident Declaration", [
    { name: "personnelId", label: "Affected Person", type: "select", options: personnel.map((p) => [p.id, `${p.name} (${p.role || "\u2014"})`]), required: true },
    { name: "type", label: "Incident Type", type: "select", options: ["Medical Emergency", "Overdue check-in", "Equipment Failure", "Weather Hazard", "Other"], default: "Medical Emergency" },
    { name: "severity", label: "Severity", type: "select", options: ["low", "medium", "high", "critical"], default: "high" },
    { name: "notes", label: "Notes", type: "textarea", full: true },
  ], async (data) => {
    const result = await api("/incidents/declare", { method: "POST", body: JSON.stringify(data) });
    showToast(`Incident ${result.incident.id} declared \u2014 response team notified.`, true);
    renderEmergency();
  }, "btn--alert", "Declare Incident"));

  const panel = el(`<div class="section-gap"><div class="panel-title">Open &amp; Recent Incidents</div></div>`);
  const openIncidents = incidents.filter((i) => i.status === "open");
  const resolvedIncidents = incidents.filter((i) => i.status !== "open");

  if (incidents.length === 0) {
    panel.appendChild(el(`<div class="empty-state"><strong>No incidents on record</strong>Declared incidents will appear here with full response context.</div>`));
  }

  openIncidents.forEach((i) => panel.appendChild(incidentCard(i, personnel, true)));
  resolvedIncidents.forEach((i) => panel.appendChild(incidentCard(i, personnel, false)));

  content.appendChild(panel);
}

function incidentCard(incident, personnel, open) {
  const person = personnel.find((p) => p.id === incident.personnelId);
  const nearby = person ? personnel.filter((p) => p.expeditionId === person.expeditionId && p.id !== person.id) : [];

  const card = el(`
    <div class="incident-card">
      <div class="incident-head">
        <div>
          <span class="incident-title">${incident.type}</span>
          <span class="id">&nbsp;&mdash;&nbsp;${incident.id}</span>
        </div>
        ${badge(incident.status)}
      </div>
      <div class="incident-meta">
        Affected: <strong style="color:var(--text-hi)">${person ? person.name : "Unknown"}</strong>
        &nbsp;\u00b7&nbsp; Severity: ${incident.severity}
        &nbsp;\u00b7&nbsp; Declared ${timeAgo(incident.declaredAt)}
        ${person ? `&nbsp;\u00b7&nbsp; Last position: ${person.location}` : ""}
      </div>
      ${incident.notes ? `<div class="incident-notes">${incident.notes}</div>` : ""}
    </div>`);

  if (open) {
    const grid = el(`<div class="response-grid"></div>`);
    const nearbyCard = el(`<div class="card"><h4>Nearby Personnel</h4></div>`);
    const list = el(`<ul class="response-list"></ul>`);
    if (nearby.length === 0) list.appendChild(el(`<li class="text-low">No other personnel on this expedition.</li>`));
    nearby.forEach((p) => list.appendChild(el(`<li><span class="name">${p.name}</span><span class="mono text-low">${p.location}</span></li>`)));
    nearbyCard.appendChild(list);

    const actionsCard = el(`<div class="card"><h4>Response Actions</h4></div>`);
    const actions = el(`<div style="display:flex;gap:8px;flex-wrap:wrap"></div>`);
    const resolveBtn = el(`<button class="btn btn--sm">Mark Resolved</button>`);
    resolveBtn.addEventListener("click", async () => {
      await api(`/incidents/${incident.id}`, { method: "PATCH", body: JSON.stringify({ status: "resolved" }) });
      if (person) await api(`/personnel/${person.id}`, { method: "PATCH", body: JSON.stringify({ status: "in-camp" }) });
      showToast(`Incident ${incident.id} marked resolved.`);
      renderEmergency();
    });
    actions.appendChild(resolveBtn);
    actionsCard.appendChild(actions);

    grid.appendChild(nearbyCard);
    grid.appendChild(actionsCard);
    card.appendChild(grid);
  }

  return card;
}

// ============================================================
// SHARED: add-record form + status <select>
// ============================================================
function addFormCard(title, fields, onSubmit, btnClass = "btn", btnLabel = "Add") {
  const card = el(`<div class="card"><div class="panel-title">${title}</div></div>`);
  const form = el(`<form class="form-row"></form>`);

  fields.forEach((f) => {
    const wrap = el(`<div class="field" style="${f.full ? "flex-basis:100%" : ""}"></div>`);
    wrap.appendChild(el(`<label>${f.label}${f.required ? " *" : ""}</label>`));
    let input;
    if (f.type === "select") {
      const opts = f.options.map((o) => Array.isArray(o) ? o : [o, o]);
      input = el(`<select name="${f.name}">${opts.map(([v, l]) => `<option value="${v}" ${f.default === v ? "selected" : ""}>${l}</option>`).join("")}</select>`);
    } else if (f.type === "textarea") {
      input = el(`<textarea name="${f.name}"></textarea>`);
    } else {
      input = el(`<input name="${f.name}" type="${f.type || "text"}" ${f.required ? "required" : ""} />`);
    }
    wrap.appendChild(input);
    form.appendChild(wrap);
  });

  const submitBtn = el(`<button type="submit" class="${btnClass}">${btnLabel}</button>`);
  form.appendChild(submitBtn);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {};
    new FormData(form).forEach((v, k) => (data[k] = v));
    submitBtn.disabled = true;
    try {
      await onSubmit(data);
      form.reset();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  card.appendChild(form);
  return card;
}

// Status selects are rendered as HTML strings inside table template literals;
// a single delegated listener on #content handles change events for all of them.
function statusSelect(resource, itemId, current, options) {
  return `<select class="status-select" data-resource="${resource}" data-id="${itemId}">${options
    .map((o) => `<option value="${o}" ${o === current ? "selected" : ""}>${o}</option>`)
    .join("")}</select>`;
}

content.addEventListener("change", async (e) => {
  const sel = e.target.closest("select.status-select[data-resource]");
  if (!sel) return;
  const { resource, id } = sel.dataset;
  await api(`/${resource}/${id}`, { method: "PATCH", body: JSON.stringify({ status: sel.value }) });
  showToast("Status updated.");
  render();
});

// ---------- boot ----------
render();
