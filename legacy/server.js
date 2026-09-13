const express = require("express");
const path = require("path");
const { db, id } = require("./data/store");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- helpers ----------
function collection(name) {
  return db[name];
}
function findOr404(name, itemId, res) {
  const item = db[name].find((x) => x.id === itemId);
  if (!item) {
    res.status(404).json({ error: `${name.slice(0, -1)} ${itemId} not found` });
    return null;
  }
  return item;
}

// ---------- generic CRUD for simple resources ----------
function registerResource(name) {
  app.get(`/api/${name}`, (req, res) => res.json(collection(name)));

  app.post(`/api/${name}`, (req, res) => {
    const item = { id: `${name.slice(0, 3).toUpperCase()}-${id()}`, ...req.body };
    db[name].push(item);
    res.status(201).json(item);
  });

  app.patch(`/api/${name}/:itemId`, (req, res) => {
    const item = findOr404(name, req.params.itemId, res);
    if (!item) return;
    Object.assign(item, req.body);
    res.json(item);
  });

  app.delete(`/api/${name}/:itemId`, (req, res) => {
    const idx = db[name].findIndex((x) => x.id === req.params.itemId);
    if (idx === -1) return res.status(404).json({ error: "not found" });
    db[name].splice(idx, 1);
    res.status(204).end();
  });
}

["expeditions", "cargo", "inventory", "personnel", "incidents"].forEach(registerResource);

// ---------- emergency: declare incident with enriched response ----------
app.post("/api/incidents/declare", (req, res) => {
  const { personnelId, type, severity, notes } = req.body;
  const person = db.personnel.find((p) => p.id === personnelId);
  if (!person) return res.status(404).json({ error: "personnel not found" });

  const incident = {
    id: `INC-${id()}`,
    personnelId,
    type: type || "Emergency",
    severity: severity || "high",
    status: "open",
    declaredAt: new Date().toISOString(),
    notes: notes || "",
  };
  db.incidents.push(incident);
  person.status = "incident";

  // nearest personnel = simple prototype heuristic: same expedition, not the affected person
  const nearby = db.personnel.filter(
    (p) => p.expeditionId === person.expeditionId && p.id !== person.id
  );
  const nearbyInventory = db.inventory.filter((inv) =>
    inv.category === "Medical" || inv.category === "Safety Equipment"
  );

  res.status(201).json({ incident, affectedPerson: person, nearbyPersonnel: nearby, nearbyInventory });
});

// ---------- dashboard summary ----------
app.get("/api/dashboard", (req, res) => {
  const activeExpeditions = db.expeditions.filter((e) => e.status === "active").length;
  const cargoInTransit = db.cargo.filter((c) => c.status === "in-transit").length;
  const cargoDelayed = db.cargo.filter((c) => c.status === "delayed").length;
  const lowStock = db.inventory.filter((i) => i.quantity <= i.reorderLevel);
  const overduePersonnel = db.personnel.filter((p) => p.status === "overdue" || p.status === "incident");
  const openIncidents = db.incidents.filter((i) => i.status === "open");

  res.json({
    counts: {
      expeditions: db.expeditions.length,
      activeExpeditions,
      cargoTotal: db.cargo.length,
      cargoInTransit,
      cargoDelayed,
      inventoryLocations: new Set(db.inventory.map((i) => i.location)).size,
      lowStockCount: lowStock.length,
      personnelTotal: db.personnel.length,
      overduePersonnelCount: overduePersonnel.length,
      openIncidentsCount: openIncidents.length,
    },
    lowStock,
    overduePersonnel,
    openIncidents,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Polar Expedition Logistics prototype running at http://localhost:${PORT}`);
});
