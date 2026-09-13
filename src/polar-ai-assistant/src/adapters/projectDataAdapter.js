/**
 * POLAR AI ASSISTANT — UNIVERSAL PROJECT DATA ADAPTER
 * ====================================================
 * Decouples the AI Assistant and Query Engine from host application state.
 * Any POLAR version or host platform can supply its live data through this
 * adapter interface without modifying the AI engine.
 */

export class ProjectDataAdapter {
  constructor(options = {}) {
    this.projectName = options.projectName || 'POLAR'
    this.dataSource = options.dataSource || {}
    this.schemaOverrides = options.schemaOverrides || {}
  }

  getRawData() {
    if (typeof this.dataSource === 'function') {
      return this.dataSource() || {}
    }
    return this.dataSource || {}
  }

  getProjectData() {
    const raw = this.getRawData()

    const expeditions = this.getExpeditions(raw)
    const personnel = this.getPersonnel(raw)
    const locations = this.getLocations(raw)
    const cargo = this.getCargo(raw)
    const inventory = this.getInventory(raw)
    const emergencies = this.getEmergencies(raw)
    const stats = this.getStats(raw, { expeditions, personnel, cargo, inventory, emergencies })
    const weather = this.getWeather(raw)

    return {
      projectName: this.projectName,
      expeditions,
      personnel,
      locations,
      cargo,
      inventory,
      emergencies,
      stats,
      weather,
    }
  }

  getExpeditions(raw = this.getRawData()) {
    const list = raw.expeditions || raw.missions || []
    return Array.isArray(list) ? list : []
  }

  getPersonnel(raw = this.getRawData()) {
    const list = raw.personnel || raw.devices || raw.operators || raw.team || []
    return Array.isArray(list) ? list : []
  }

  getLocations(raw = this.getRawData()) {
    const list = raw.locations || raw.stations || raw.bases || raw.sites || []
    return Array.isArray(list) ? list : []
  }

  getCargo(raw = this.getRawData()) {
    const list = raw.cargo || raw.consignments || raw.shipments || []
    return Array.isArray(list) ? list : []
  }

  getInventory(raw = this.getRawData()) {
    const list = raw.inventory || raw.supplies || raw.stock || raw.items || []
    return Array.isArray(list) ? list : []
  }

  getEmergencies(raw = this.getRawData()) {
    const list = raw.emergencies || raw.incidents || raw.alerts || []
    return Array.isArray(list) ? list : []
  }

  getWeather(raw = this.getRawData()) {
    return raw.weather || {}
  }

  getStats(raw = this.getRawData(), normalized = {}) {
    if (raw.stats && typeof raw.stats === 'object' && Object.keys(raw.stats).length > 0) {
      return raw.stats
    }

    const exp = normalized.expeditions || this.getExpeditions(raw)
    const ppl = normalized.personnel || this.getPersonnel(raw)
    const crg = normalized.cargo || this.getCargo(raw)
    const inv = normalized.inventory || this.getInventory(raw)
    const emg = normalized.emergencies || this.getEmergencies(raw)

    const activeExpeditions = exp.filter(
      (e) => String(e.status || '').toUpperCase() === 'ACTIVE'
    ).length

    const deployedPersonnel = ppl.filter(
      (p) => p.is_active !== false && String(p.status || '').toUpperCase() !== 'OFF_DUTY'
    ).length

    const lowStockItems = inv.filter((item) => {
      const q = Number(item.quantity ?? item.current_quantity ?? 0)
      const m = Number(item.minimum_quantity ?? item.minimum_stock ?? 0)
      return q < m
    }).length

    const delayedCargo = crg.filter(
      (c) => String(c.status || '').toUpperCase() === 'DELAYED'
    ).length

    const activeAlerts = emg.filter(
      (e) => String(e.status || '').toUpperCase() !== 'RESOLVED'
    ).length

    return {
      activeExpeditions: activeExpeditions || exp.length,
      deployedPersonnel: deployedPersonnel || ppl.length,
      lowStockItems,
      delayedCargo,
      activeAlerts,
    }
  }
}

export function createProjectDataAdapter(dataSource, options = {}) {
  return new ProjectDataAdapter({ dataSource, ...options })
}
