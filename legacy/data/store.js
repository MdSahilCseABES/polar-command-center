// In-memory data store for the prototype.
// Resets whenever the server restarts — this is intentional for a prototype;
// a production build would replace this module with a real database layer.

let nextId = 1000;
function id() { return String(nextId++); }

const db = {
  expeditions: [
    {
      id: "EXP-01", name: "Ross Ice Shelf Traverse", region: "Antarctica \u2014 Ross Sea Sector",
      leader: "K. Sorensen", startDate: "2026-11-02", endDate: "2026-12-20",
      status: "planning", teamSize: 9,
      notes: "Season resupply + ice-core sampling traverse, 3 camps."
    },
    {
      id: "EXP-02", name: "Devon Island Resupply", region: "Canadian High Arctic",
      leader: "M. Okafor", startDate: "2026-08-10", endDate: "2026-08-28",
      status: "active", teamSize: 5,
      notes: "Annual base resupply and equipment rotation."
    },
    {
      id: "EXP-03", name: "Svalbard Glaciology Survey", region: "Svalbard, Norway",
      leader: "A. Lindqvist", startDate: "2026-06-01", endDate: "2026-06-30",
      status: "completed", teamSize: 6,
      notes: "Completed ahead of schedule; equipment returned to depot."
    },
  ],

  cargo: [
    { id: "CRG-01", expeditionId: "EXP-02", description: "Fuel drums (200L x 12)", origin: "Resolute Bay Depot", destination: "Devon Island Camp A", weightKg: 2400, status: "delivered" },
    { id: "CRG-02", expeditionId: "EXP-02", description: "Medical resupply kit", origin: "Resolute Bay Depot", destination: "Devon Island Camp A", weightKg: 85, status: "in-transit" },
    { id: "CRG-03", expeditionId: "EXP-02", description: "Generator + spare parts", origin: "Resolute Bay Depot", destination: "Devon Island Camp A", weightKg: 610, status: "delayed" },
    { id: "CRG-04", expeditionId: "EXP-01", description: "Ice-core drilling rig", origin: "McMurdo Station", destination: "Camp 2 (Ross Ice Shelf)", weightKg: 1450, status: "staged" },
    { id: "CRG-05", expeditionId: "EXP-01", description: "Food cache \u2014 6 weeks", origin: "McMurdo Station", destination: "Camp 1 (Ross Ice Shelf)", weightKg: 980, status: "staged" },
  ],

  inventory: [
    { id: "INV-01", location: "Devon Island Camp A", item: "Diesel fuel", category: "Fuel", quantity: 1800, unit: "L", reorderLevel: 600 },
    { id: "INV-02", location: "Devon Island Camp A", item: "Trauma kits", category: "Medical", quantity: 3, unit: "kits", reorderLevel: 4 },
    { id: "INV-03", location: "McMurdo Station", item: "Ration packs", category: "Food", quantity: 640, unit: "packs", reorderLevel: 200 },
    { id: "INV-04", location: "McMurdo Station", item: "Cold-weather sleeping bags", category: "Safety Equipment", quantity: 22, unit: "units", reorderLevel: 10 },
    { id: "INV-05", location: "Camp 1 (Ross Ice Shelf)", item: "Avalanche beacons", category: "Safety Equipment", quantity: 8, unit: "units", reorderLevel: 8 },
  ],

  personnel: [
    { id: "PER-01", name: "K. Sorensen", role: "Expedition Leader", expeditionId: "EXP-01", status: "in-camp", location: "Camp 1 (Ross Ice Shelf)", lastCheckIn: "2026-08-22T07:10:00Z" },
    { id: "PER-02", name: "R. Vasquez", role: "Field Medic", expeditionId: "EXP-01", status: "en-route", location: "Between Camp 1 and Camp 2", lastCheckIn: "2026-08-22T05:40:00Z" },
    { id: "PER-03", name: "M. Okafor", role: "Logistics Lead", expeditionId: "EXP-02", status: "in-camp", location: "Devon Island Camp A", lastCheckIn: "2026-08-22T08:00:00Z" },
    { id: "PER-04", name: "T. Nakamura", role: "Field Scientist", expeditionId: "EXP-02", status: "overdue", location: "Last seen: Ridge Route KM 6", lastCheckIn: "2026-08-21T22:15:00Z" },
    { id: "PER-05", name: "A. Lindqvist", role: "Glaciologist", expeditionId: "EXP-03", status: "in-camp", location: "Longyearbyen Base", lastCheckIn: "2026-08-20T09:00:00Z" },
  ],

  incidents: [
    { id: "INC-01", personnelId: "PER-04", type: "Overdue check-in", severity: "high", status: "open", declaredAt: "2026-08-22T06:30:00Z", notes: "T. Nakamura missed 06:00 scheduled check-in on Ridge Route. Weather deteriorating." },
  ],
};

module.exports = { db, id };
