/**
 * MAP INTEGRATION — Leaflet + OpenStreetMap
 * =========================================
 * A single situational-awareness view: every site, every person and every
 * open incident on one chart, all read from the SAME shared store the rest
 * of the console uses (src/store/DataContext.jsx).
 *
 * THAT IS THE POINT. This page owns no data of its own. So:
 *   - change someone's duty status on the Personnel page  -> their dot
 *     changes colour here
 *   - move someone to another station                     -> their dot moves
 *   - report an emergency on the Emergency page           -> a red ring
 *     appears here AND the person involved turns red
 * None of that needed a single line of "tell the map to update" code.
 *
 * HONESTY, WHICH MATTERS MORE THAN THE FEATURE (see the footer too):
 *   The three station coordinates are REAL — Maitri, Bharati and Himadri
 *   are India's actual polar stations and those are their published
 *   positions. Personnel records may contain demo coordinates until a selected device supplies real GPS. Device GPS uses the browser Geolocation API when explicitly started.
 *
 * TWO LEAFLET THINGS WORTH KNOWING IF YOU EDIT THIS FILE:
 *   1. Leaflet is not a React library — it draws straight onto a DOM node.
 *      So we create the map inside useEffect, keep it in a ref, and tear
 *      it down in the cleanup function. Without that teardown React's
 *      StrictMode (which mounts every component twice in development)
 *      leaves you with two maps stacked on top of each other.
 *   2. Markers are plain HTML (L.divIcon) styled in src/index.css, not
 *      Leaflet's default blue pin. The default pin loads a PNG by
 *      relative path, which bundlers like Vite break — and our own
 *      shapes look far more like an operations console anyway.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Copy,
  Crosshair,
  Globe,
  Layers,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  MapPinned,
  Maximize2,
  Minimize2,
  Navigation,
  Radio,
  RefreshCw,
  Route,
  Search,
  Sparkles,
  Users,
  Wind,
  X,
} from 'lucide-react'

import GlobeView from '../components/GlobeView'
import Panel from '../components/Panel'
import Badge from '../components/Badge'
import StateBlock from '../components/StateBlock'
import SourceBadge from '../components/SourceBadge'
import { useData } from '../store/DataContext'
import {
  EMERGENCY_STATUS,
  EMERGENCY_TYPE,
  LOCATION_TYPE,
  PERSONNEL_STATUS,
  SEVERITY,
  statusLabel,
} from '../lib/statuses'
import { formatCoords, timeAgo } from '../lib/format'
import useGeolocation from '../hooks/useGeolocation'
import { fetchLocationHistory } from '../services/personnelLocationService'

/* ============================================================
   CONSTANTS
   ============================================================ */

/* Basemap style presets:
   1. NATGEO: National Geographic Physical Atlas (relief, country borders, natural greens/tans, soft azure oceans)
   2. TOPO: Topographic Relief
   3. VOYAGER: CartoDB Voyager
   4. SATELLITE: Esri Photorealistic World Imagery
   5. STREET: OpenStreetMap Tactical */
export const MAP_STYLES = {
  NATGEO: {
    id: 'NATGEO',
    name: 'Physical Atlas',
    icon: '🌍',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; National Geographic, Esri, DeLorme, HERE, USGS',
    className: 'map-tiles--realistic',
    maxZoom: 16,
    background: '#7eaec9',
  },
  TOPO: {
    id: 'TOPO',
    name: 'Relief / Topo',
    icon: '🏔️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, USGS',
    className: 'map-tiles--realistic',
    maxZoom: 18,
    background: '#102a43',
  },
  VOYAGER: {
    id: 'VOYAGER',
    name: 'Natural Earth',
    icon: '🗺️',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors, &copy; CARTO',
    className: 'map-tiles--realistic',
    maxZoom: 19,
    background: '#eaf2f8',
  },
  SATELLITE: {
    id: 'SATELLITE',
    name: 'Satellite',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar, USGS',
    className: 'map-tiles--realistic',
    maxZoom: 18,
    background: '#040a14',
  },
  STREET: {
    id: 'STREET',
    name: 'Tactical OSM',
    icon: '🧭',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    className: 'map-tiles--standard',
    maxZoom: 18,
    background: '#0b1522',
  },
}

const TILE_URL = MAP_STYLES.NATGEO.url
const TILE_ATTRIBUTION = MAP_STYLES.NATGEO.attribution

/* ============================================================
   CONTINUOUS OMNIDIRECTIONAL TILE LAYER (Infinite X & Y Wrapping)
   ============================================================
   Leaflet's default tile layer only wraps coordinates horizontally (longitude).
   Along the latitude axis (vertical / Y), standard Web Mercator tile servers
   have no tiles for y < 0 or y >= 2^z, which causes Leaflet to reject tile
   requests and leave empty blank/blue voids when panning up past Antarctica
   or down past the Arctic.
   
   ContinuousTileLayer seamlessly wraps BOTH horizontal (X) and vertical (Y)
   coordinates across the infinite grid modulo 2^z, and overrides _getTiledPixelBounds
   to calculate bounds directly from the container's physical pixel position.
   This guarantees that tiles load continuously everywhere in all directions
   with ZERO blank blocks.
*/
export const ContinuousTileLayer = L.TileLayer.extend({
  _resetGrid: function () {
    L.TileLayer.prototype._resetGrid.call(this)
    if (this._tileZoom !== undefined) {
      const max = Math.pow(2, this._tileZoom)
      this._wrapX = [0, max]
      this._wrapY = [0, max]
    }
  },

  _getTiledPixelBounds: function () {
    const map = this._map
    if (!map) return new L.Bounds([0, 0], [0, 0])
    const mapZoom = map._animatingZoom ? Math.max(map._animateToZoom, map.getZoom()) : map.getZoom()
    const scale = map.getZoomScale(mapZoom, this._tileZoom)

    const pixelOrigin = map.getPixelOrigin()
    const panePos = map._getMapPanePos ? map._getMapPanePos() : (L.DomUtil.getPosition(map._mapPane) || new L.Point(0, 0))
    const topLeft = pixelOrigin.subtract(panePos)
    const size = map.getSize()

    if (scale !== 1) {
      const centerPoint = topLeft.add(size.divideBy(2))
      const halfSize = size.divideBy(scale * 2)
      return new L.Bounds(centerPoint.subtract(halfSize), centerPoint.add(halfSize))
    }
    return new L.Bounds(topLeft, topLeft.add(size))
  },

  _wrapCoords: function (coords) {
    const max = Math.pow(2, coords.z)
    const wrappedX = ((coords.x % max) + max) % max
    const wrappedY = ((coords.y % max) + max) % max
    const newCoords = new L.Point(wrappedX, wrappedY)
    newCoords.z = coords.z
    return newCoords
  },

  _isValidTile: function () {
    return true
  },
})

export function createContinuousTileLayer(url, options = {}) {
  return new ContinuousTileLayer(url, {
    minZoom: 2,
    maxZoom: 18,
    keepBuffer: 4,
    updateWhenIdle: false,
    ...options,
  })
}

/* ============================================================
   OPERATIONAL POLAR CORRIDORS & TRAVERSE ROUTES
   ============================================================ */
export const OPERATIONAL_ROUTES = [
  {
    id: 'ROUTE-GOA-CPT',
    name: 'Strategic Air & Sea Staging Corridor',
    fromName: 'NCPOR Goa HQ',
    toName: 'Cape Town Gateway',
    color: '#0ea5e9',
    dashArray: '6 6',
    weight: 2.5,
    points: [
      [15.3833, 73.8167], // NCPOR Goa
      [-4.6796, 55.4920], // Seychelles
      [-20.3484, 57.5522], // Mauritius
      [-33.9249, 18.4241], // Cape Town
    ],
    description: 'Intercontinental personnel deployment and polar cargo staging corridor.',
  },
  {
    id: 'ROUTE-CPT-NOVO',
    name: 'DROMLAN Antarctic Air-Bridge Corridor',
    fromName: 'Cape Town Gateway',
    toName: 'Novo Runway / Maitri',
    color: '#38bdf8',
    dashArray: '5 5',
    weight: 2.5,
    points: [
      [-33.9249, 18.4241], // Cape Town
      [-54.4296, 3.4064], // Southern Ocean Corridor Waypoint
      [-70.8465, 11.8378], // Novo Runway
      [-70.7667, 11.7333], // Maitri Station
    ],
    description: 'Intercontinental IL-76 and Basler BT-67 air link into Queen Maud Land.',
  },
  {
    id: 'ROUTE-CPT-BHARATI',
    name: 'Southern Ocean Maritime Resupply Route',
    fromName: 'Cape Town Gateway',
    toName: 'Bharati Station',
    color: '#818cf8',
    dashArray: '6 6',
    weight: 2.5,
    points: [
      [-33.9249, 18.4241], // Cape Town
      [-38.642, 48.915], // MV Polar Pioneer en route
      [-48.214, 32.418], // ORV Sagar Nidhi en route
      [-69.4067, 76.1867], // Bharati Station
    ],
    description: 'Southern Ocean maritime supply route for fuel, heavy equipment, and oceanographic research.',
  },
  {
    id: 'ROUTE-MAITRI-TRAVERSE',
    name: 'Maitri – Schirmacher Overland Traverse',
    fromName: 'Maitri Station',
    toName: 'Schirmacher Camp & DG Depot',
    color: '#f59e0b',
    dashArray: '4 4',
    weight: 3,
    points: [
      [-70.7667, 11.7333], // Maitri
      [-70.7412, 11.6021], // Schirmacher Field Camp
      [-70.0833, 12.0000], // Dakshin Gangotri Depot
    ],
    description: 'PistenBully tracked convoy route for ice-core drilling and depot replenishment.',
  },
  {
    id: 'ROUTE-BHARATI-TRAVERSE',
    name: 'Larsemann Hills Coastal Traverse',
    fromName: 'Bharati Station',
    toName: 'Larsemann Camp',
    color: '#10b981',
    dashArray: '4 4',
    weight: 3,
    points: [
      [-69.4067, 76.1867], // Bharati
      [-69.3921, 76.2510], // Larsemann Camp
    ],
    description: 'Coastal sea-ice and snow-scooter traverse for lake-sediment core sampling.',
  },
  {
    id: 'ROUTE-ARCTIC-CORRIDOR',
    name: 'Svalbard Arctic Science Corridor',
    fromName: 'Longyearbyen Staging',
    toName: 'Himadri Station & Kongsvegen',
    color: '#06b6d4',
    dashArray: '5 5',
    weight: 2.5,
    points: [
      [78.2232, 15.6267], // Longyearbyen
      [78.9167, 11.9333], // Himadri Station
      [78.8021, 12.9855], // Kongsvegen Glacier Camp
    ],
    description: 'Arctic maritime and glacial monitoring traverse in Svalbard Archipelago.',
  },
]

/* ============================================================
   RICH POPUP HTML BUILDERS
   ============================================================ */

function buildSitePopup(site, hereCount, siteTerritory, personnelList = []) {
  const typeLabel = statusLabel(LOCATION_TYPE, site.type)
  const namesPreview = personnelList.slice(0, 3).map((p) => p.name).join(', ')
  const extraCount = personnelList.length > 3 ? ` +${personnelList.length - 3} more` : ''

  return `
    <div class="polar-popup-card">
      <div class="polar-popup-header">
        <span class="polar-popup-badge polar-popup-badge--site">${typeLabel}</span>
        <span class="polar-popup-coords">${formatCoords(site.latitude, site.longitude)}</span>
      </div>
      <div class="polar-popup-title">${site.name}</div>
      <div class="polar-popup-region">📍 ${siteTerritory.country}</div>
      <div class="polar-popup-sector">${site.region || siteTerritory.sector}</div>

      <div class="polar-popup-grid">
        <div class="polar-popup-row">
          <span class="polar-popup-k">Stationed Crew</span>
          <span class="polar-popup-v font-bold">${hereCount} personnel</span>
        </div>
        ${
          namesPreview
            ? `
        <div class="polar-popup-row" style="font-size: 10.5px;">
          <span class="polar-popup-k">Roster</span>
          <span class="polar-popup-v truncate" style="max-width: 140px;" title="${personnelList.map((p) => p.name).join(', ')}">${namesPreview}${extraCount}</span>
        </div>`
            : ''
        }
        ${
          site.capacity
            ? `
        <div class="polar-popup-row">
          <span class="polar-popup-k">Capacity</span>
          <span class="polar-popup-v">${
            typeof site.capacity === 'object'
              ? `${site.capacity.winter}W / ${site.capacity.summer}S`
              : `${site.capacity} max`
          }</span>
        </div>`
            : ''
        }
        ${
          site.elevation_m != null
            ? `
        <div class="polar-popup-row">
          <span class="polar-popup-k">Elevation</span>
          <span class="polar-popup-v font-mono">${site.elevation_m} m MSL</span>
        </div>`
            : ''
        }
        <div class="polar-popup-row">
          <span class="polar-popup-k">Jurisdiction</span>
          <span class="polar-popup-v text-right" style="font-size: 10px; max-width: 140px;">${siteTerritory.jurisdiction}</span>
        </div>
      </div>

      <div class="polar-popup-actions">
        <button type="button" class="polar-popup-btn polar-popup-btn--primary" data-action="goto" data-target="personnel">
          View Roster
        </button>
        <button type="button" class="polar-popup-btn" data-action="goto" data-target="weather">
          Weather
        </button>
        <button type="button" class="polar-popup-btn polar-popup-btn--alert" data-action="goto" data-target="emergency">
          Report SOS
        </button>
      </div>
    </div>
  `
}

function buildPersonPopup(person, position, personTerritory, loc, expedition, emergencyAlert) {
  const statusLbl = statusLabel(PERSONNEL_STATUS, person.status)
  const isEmergency = person.status === 'EMERGENCY'
  const gps = gpsState(person)

  return `
    <div class="polar-popup-card">
      <div class="polar-popup-header">
        <span class="polar-popup-badge ${isEmergency ? 'polar-popup-badge--critical' : 'polar-popup-badge--person'}">${statusLbl}</span>
        <span class="polar-popup-badge polar-popup-badge--gps">${gps}</span>
        <span class="polar-popup-coords">${formatCoords(position[0], position[1])}</span>
      </div>
      <div class="polar-popup-title">${person.name}</div>
      <div class="polar-popup-region">📍 ${personTerritory.country}</div>
      <div class="polar-popup-sector">${person.role} · ${personTerritory.sector}</div>

      <div class="polar-popup-grid">
        <div class="polar-popup-row">
          <span class="polar-popup-k">Base / Site</span>
          <span class="polar-popup-v">${loc?.name || 'In Transit'}</span>
        </div>
        <div class="polar-popup-row">
          <span class="polar-popup-k">Expedition</span>
          <span class="polar-popup-v truncate" style="max-width: 140px;">${expedition?.name || person.expedition_id || '—'}</span>
        </div>
        <div class="polar-popup-row">
          <span class="polar-popup-k">Readiness</span>
          <span class="polar-popup-v font-mono">${person.readiness || '100%'}</span>
        </div>
        <div class="polar-popup-row">
          <span class="polar-popup-k">GPS Fix</span>
          <span class="polar-popup-v">${person.gps_accuracy != null ? `±${Math.round(Number(person.gps_accuracy))}m` : 'Telemetry Fix'}</span>
        </div>
        ${
          emergencyAlert
            ? `
        <div class="polar-popup-alert-bar">
          🚨 Active Incident: ${emergencyAlert.title || emergencyAlert.type}
        </div>`
            : ''
        }
      </div>

      <div class="polar-popup-actions">
        <button type="button" class="polar-popup-btn polar-popup-btn--primary" data-action="goto" data-target="personnel">
          Operative Profile
        </button>
        <button type="button" class="polar-popup-btn" data-action="goto" data-target="weather">
          Local Weather
        </button>
        <button type="button" class="polar-popup-btn polar-popup-btn--alert" data-action="goto" data-target="emergency">
          ${isEmergency ? 'Incident SOS' : 'File Report'}
        </button>
      </div>
    </div>
  `
}

function buildIncidentPopup(incident, incidentTerritory, casualty) {
  const sevLabel = statusLabel(SEVERITY, incident.severity)
  const typeLabel = statusLabel(EMERGENCY_TYPE, incident.type)
  const statusLbl = statusLabel(EMERGENCY_STATUS, incident.status)

  return `
    <div class="polar-popup-card polar-popup-card--critical">
      <div class="polar-popup-header">
        <span class="polar-popup-badge polar-popup-badge--critical">${sevLabel}</span>
        <span class="polar-popup-badge" style="background:rgba(239,68,68,0.2);color:var(--red);">${incident.id}</span>
        <span class="polar-popup-coords">${formatCoords(incident.latitude, incident.longitude)}</span>
      </div>
      <div class="polar-popup-title">${incident.title || typeLabel}</div>
      <div class="polar-popup-region" style="color:var(--red);">🚨 ${incidentTerritory.country}</div>
      <div class="polar-popup-sector">${incident.location || incidentTerritory.sector}</div>

      <div class="polar-popup-grid">
        <div class="polar-popup-row">
          <span class="polar-popup-k">Status</span>
          <span class="polar-popup-v font-bold" style="color:var(--red);">${statusLbl}</span>
        </div>
        <div class="polar-popup-row">
          <span class="polar-popup-k">Reported</span>
          <span class="polar-popup-v">${timeAgo(incident.reported_at)}</span>
        </div>
        ${
          casualty
            ? `
        <div class="polar-popup-row">
          <span class="polar-popup-k">Casualty Involved</span>
          <span class="polar-popup-v font-semibold">${casualty.name} (${casualty.role})</span>
        </div>`
            : ''
        }
        ${
          incident.assigned_team
            ? `
        <div class="polar-popup-row">
          <span class="polar-popup-k">Response Team</span>
          <span class="polar-popup-v">${incident.assigned_team}</span>
        </div>`
            : ''
        }
      </div>

      <div class="polar-popup-actions">
        <button type="button" class="polar-popup-btn polar-popup-btn--alert" data-action="goto" data-target="emergency">
          Emergency Console
        </button>
        <button type="button" class="polar-popup-btn" data-action="goto" data-target="weather">
          Wind & Storm
        </button>
      </div>
    </div>
  `
}

function buildWorkstationPopup(userLocation, userTerritory) {
  return `
    <div class="polar-popup-card">
      <div class="polar-popup-header">
        <span class="polar-popup-badge polar-popup-badge--site">ACTIVE WORKSTATION</span>
        <span class="polar-popup-coords">±${userLocation.accuracy}m fix</span>
      </div>
      <div class="polar-popup-title">Current Workstation Location</div>
      <div class="polar-popup-region">📍 ${userTerritory.country}</div>
      <div class="polar-popup-sector">${userTerritory.sector}</div>

      <div class="polar-popup-grid">
        <div class="polar-popup-row">
          <span class="polar-popup-k">WGS-84 Coordinates</span>
          <span class="polar-popup-v font-mono">${userLocation.latitude.toFixed(5)}°, ${userLocation.longitude.toFixed(5)}°</span>
        </div>
        <div class="polar-popup-row">
          <span class="polar-popup-k">Sensor Timestamp</span>
          <span class="polar-popup-v">${new Date(userLocation.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="polar-popup-row">
          <span class="polar-popup-k">Geodetic Territory</span>
          <span class="polar-popup-v text-right" style="font-size: 10px; max-width: 140px;">${userTerritory.jurisdiction}</span>
        </div>
      </div>

      <div class="polar-popup-actions">
        <button type="button" class="polar-popup-btn polar-popup-btn--primary" data-action="goto" data-target="weather">
          Local Weather
        </button>
        <button type="button" class="polar-popup-btn polar-popup-btn--alert" data-action="goto" data-target="emergency">
          Report Incident
        </button>
      </div>
    </div>
  `
}

function buildSurveyPointPopup(customPoint) {
  const { lat, lng, territoryInfo, nearestBase } = customPoint
  return `
    <div class="polar-popup-card">
      <div class="polar-popup-header">
        <span class="polar-popup-badge" style="background:rgba(245,158,11,0.15);color:var(--amber);">SURVEY TARGET PIN</span>
        <span class="polar-popup-coords">${formatCoords(lat, lng)}</span>
      </div>
      <div class="polar-popup-title">${territoryInfo.country}</div>
      <div class="polar-popup-region" style="color:var(--amber);">🌐 ${territoryInfo.sector}</div>
      <div class="polar-popup-sector" style="font-size: 10.5px;">${territoryInfo.jurisdiction}</div>

      <div class="polar-popup-grid">
        <div class="polar-popup-row">
          <span class="polar-popup-k">Nearest Base</span>
          <span class="polar-popup-v font-semibold">${nearestBase ? `${nearestBase.name} (${nearestBase.distanceKm} km)` : 'None in range'}</span>
        </div>
        ${
          nearestBase
            ? `
        <div class="polar-popup-row">
          <span class="polar-popup-k">Vector / Bearing</span>
          <span class="polar-popup-v">${nearestBase.bearingDeg}° (${nearestBase.bearingCardinal})</span>
        </div>`
            : ''
        }
        <div class="polar-popup-row">
          <span class="polar-popup-k">Surface Terrain</span>
          <span class="polar-popup-v text-right" style="font-size: 10px; max-width: 140px;">${territoryInfo.terrain}</span>
        </div>
        <div class="polar-popup-row">
          <span class="polar-popup-k">Coordinates</span>
          <span class="polar-popup-v font-mono">${lat.toFixed(5)}°, ${lng.toFixed(5)}°</span>
        </div>
      </div>

      <div class="polar-popup-actions">
        <button type="button" class="polar-popup-btn polar-popup-btn--primary" data-action="goto" data-target="weather">
          Check Weather
        </button>
        <button type="button" class="polar-popup-btn polar-popup-btn--alert" data-action="goto" data-target="emergency">
          Report SOS Here
        </button>
      </div>
    </div>
  `
}

/* Fast searchable country catalog with coordinates, centroids & polar connections */
export const WORLD_COUNTRIES = [
  { name: 'India', code: 'IN', flag: '🇮🇳', lat: 20.5937, lng: 78.9629, zoom: 5, continent: 'Asia', capital: 'New Delhi', polarNote: 'HQ & Polar Mission Lead' },
  { name: 'Antarctica', code: 'AQ', flag: '🇦🇶', lat: -75.2509, lng: 0.0, zoom: 3, continent: 'Antarctica', capital: 'South Pole', polarNote: 'Maitri & Bharati Stations' },
  { name: 'Norway', code: 'NO', flag: '🇳🇴', lat: 60.4720, lng: 8.4689, zoom: 5, continent: 'Europe', capital: 'Oslo', polarNote: 'Himadri Arctic Base Host' },
  { name: 'Svalbard', code: 'SJ', flag: '🇸🇯', lat: 77.8750, lng: 16.0635, zoom: 6, continent: 'Arctic', capital: 'Longyearbyen', polarNote: 'Himadri Station (Ny-Ålesund)' },
  { name: 'South Africa', code: 'ZA', flag: '🇿🇦', lat: -30.5595, lng: 22.9375, zoom: 5, continent: 'Africa', capital: 'Pretoria / Cape Town', polarNote: 'Cape Town Staging Gateway' },
  { name: 'Chile', code: 'CL', flag: '🇨🇱', lat: -35.6751, lng: -71.5430, zoom: 5, continent: 'South America', capital: 'Santiago', polarNote: 'Punta Arenas Antarctic Gateway' },
  { name: 'Argentina', code: 'AR', flag: '🇦🇷', lat: -38.4161, lng: -63.6167, zoom: 5, continent: 'South America', capital: 'Buenos Aires', polarNote: 'Ushuaia Antarctic Gateway' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', lat: -25.2744, lng: 133.7751, zoom: 4, continent: 'Oceania', capital: 'Canberra', polarNote: 'Hobart Antarctic Gateway' },
  { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', lat: -40.9006, lng: 174.8860, zoom: 5, continent: 'Oceania', capital: 'Wellington', polarNote: 'Christchurch Gateway' },
  { name: 'United States', code: 'US', flag: '🇺🇸', lat: 37.0902, lng: -95.7129, zoom: 4, continent: 'North America', capital: 'Washington, D.C.', polarNote: 'USAP / Palmer & McMurdo' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', lat: 56.1304, lng: -106.3468, zoom: 4, continent: 'North America', capital: 'Ottawa', polarNote: 'Arctic Archipelago' },
  { name: 'Greenland', code: 'GL', flag: '🇬🇱', lat: 71.7069, lng: -42.6043, zoom: 4, continent: 'North America', capital: 'Nuuk', polarNote: 'Arctic Ice Sheet' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', lat: 55.3781, lng: -3.4360, zoom: 5, continent: 'Europe', capital: 'London', polarNote: 'British Antarctic Survey' },
  { name: 'France', code: 'FR', flag: '🇫🇷', lat: 46.2276, lng: 2.2137, zoom: 5, continent: 'Europe', capital: 'Paris', polarNote: 'Concordia & Dumont d\'Urville' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', lat: 51.1657, lng: 10.4515, zoom: 5, continent: 'Europe', capital: 'Berlin', polarNote: 'AWI / Neumayer III' },
  { name: 'Russia', code: 'RU', flag: '🇷🇺', lat: 61.5240, lng: 105.3188, zoom: 3, continent: 'Europe / Asia', capital: 'Moscow', polarNote: 'Vostok & Mirny Stations' },
  { name: 'China', code: 'CN', flag: '🇨🇳', lat: 35.8617, lng: 104.1954, zoom: 4, continent: 'Asia', capital: 'Beijing', polarNote: 'Zhongshan & Taishan' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵', lat: 36.2048, lng: 138.2529, zoom: 5, continent: 'Asia', capital: 'Tokyo', polarNote: 'Showa Station' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', lat: -14.2350, lng: -51.9253, zoom: 4, continent: 'South America', capital: 'Brasília', polarNote: 'Comandante Ferraz' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹', lat: 41.8719, lng: 12.5674, zoom: 5, continent: 'Europe', capital: 'Rome', polarNote: 'Mario Zucchelli Base' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸', lat: 40.4637, lng: -3.7492, zoom: 5, continent: 'Europe', capital: 'Madrid', polarNote: 'Juan Carlos I Base' },
  { name: 'Sweden', code: 'SE', flag: '🇸🇪', lat: 60.1282, lng: 18.6435, zoom: 5, continent: 'Europe', capital: 'Stockholm', polarNote: 'Wasa Station' },
  { name: 'Finland', code: 'FI', flag: '🇫🇮', lat: 61.9241, lng: 25.7482, zoom: 5, continent: 'Europe', capital: 'Helsinki', polarNote: 'Aboa Station' },
  { name: 'Iceland', code: 'IS', flag: '🇮🇸', lat: 64.9631, lng: -19.0208, zoom: 6, continent: 'Europe', capital: 'Reykjavik', polarNote: 'Sub-Arctic Volcanic Hub' },
  { name: 'Denmark', code: 'DK', flag: '🇩🇰', lat: 56.2639, lng: 9.5018, zoom: 6, continent: 'Europe', capital: 'Copenhagen' },
  { name: 'Poland', code: 'PL', flag: '🇵🇱', lat: 51.9194, lng: 19.1451, zoom: 5, continent: 'Europe', capital: 'Warsaw', polarNote: 'Arctowski Station' },
  { name: 'Ukraine', code: 'UA', flag: '🇺🇦', lat: 48.3794, lng: 31.1656, zoom: 5, continent: 'Europe', capital: 'Kyiv', polarNote: 'Vernadsky Base' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷', lat: 35.9078, lng: 127.7669, zoom: 6, continent: 'Asia', capital: 'Seoul', polarNote: 'King Sejong & Jang Bogo' },
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩', lat: -0.7893, lng: 113.9213, zoom: 5, continent: 'Asia', capital: 'Jakarta' },
  { name: 'Malaysia', code: 'MY', flag: '🇲🇾', lat: 4.2105, lng: 101.9758, zoom: 5, continent: 'Asia', capital: 'Kuala Lumpur' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬', lat: 1.3521, lng: 103.8198, zoom: 11, continent: 'Asia', capital: 'Singapore' },
  { name: 'Thailand', code: 'TH', flag: '🇹🇭', lat: 15.8700, lng: 100.9925, zoom: 5, continent: 'Asia', capital: 'Bangkok' },
  { name: 'Vietnam', code: 'VN', flag: '🇻🇳', lat: 14.0583, lng: 108.2772, zoom: 5, continent: 'Asia', capital: 'Hanoi' },
  { name: 'Philippines', code: 'PH', flag: '🇵🇭', lat: 12.8797, lng: 121.7740, zoom: 5, continent: 'Asia', capital: 'Manila' },
  { name: 'Pakistan', code: 'PK', flag: '🇵🇰', lat: 30.3753, lng: 69.3451, zoom: 5, continent: 'Asia', capital: 'Islamabad', polarNote: 'Jinnah Station' },
  { name: 'Bangladesh', code: 'BD', flag: '🇧🇩', lat: 23.6850, lng: 90.3563, zoom: 6, continent: 'Asia', capital: 'Dhaka' },
  { name: 'Sri Lanka', code: 'LK', flag: '🇱🇰', lat: 7.8731, lng: 80.7718, zoom: 7, continent: 'Asia', capital: 'Colombo' },
  { name: 'Nepal', code: 'NP', flag: '🇳🇵', lat: 28.3949, lng: 84.1240, zoom: 6, continent: 'Asia', capital: 'Kathmandu', polarNote: 'Third Pole / Cryosphere' },
  { name: 'Bhutan', code: 'BT', flag: '🇧🇹', lat: 27.5142, lng: 90.4336, zoom: 7, continent: 'Asia', capital: 'Thimphu' },
  { name: 'Mauritius', code: 'MU', flag: '🇲🇺', lat: -20.3484, lng: 57.5522, zoom: 9, continent: 'Africa', capital: 'Port Louis', polarNote: 'Southern Ocean Staging' },
  { name: 'Seychelles', code: 'SC', flag: '🇸🇨', lat: -4.6796, lng: 55.4920, zoom: 8, continent: 'Africa', capital: 'Victoria' },
  { name: 'Madagascar', code: 'MG', flag: '🇲🇬', lat: -18.7669, lng: 46.8691, zoom: 5, continent: 'Africa', capital: 'Antananarivo' },
  { name: 'Egypt', code: 'EG', flag: '🇪🇬', lat: 26.8206, lng: 30.8025, zoom: 5, continent: 'Africa', capital: 'Cairo' },
  { name: 'Morocco', code: 'MA', flag: '🇲🇦', lat: 31.7917, lng: -7.0926, zoom: 5, continent: 'Africa', capital: 'Rabat' },
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', lat: 9.0820, lng: 8.6753, zoom: 5, continent: 'Africa', capital: 'Abuja' },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪', lat: -0.0236, lng: 37.9062, zoom: 6, continent: 'Africa', capital: 'Nairobi' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', lat: 23.8859, lng: 45.0792, zoom: 5, continent: 'Asia', capital: 'Riyadh' },
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', lat: 23.4241, lng: 53.8478, zoom: 6, continent: 'Asia', capital: 'Abu Dhabi' },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷', lat: 38.9637, lng: 35.2433, zoom: 5, continent: 'Asia / Europe', capital: 'Ankara', polarNote: 'Horseshoe Island Camp' },
  { name: 'Mexico', code: 'MX', flag: '🇲🇽', lat: 23.6345, lng: -102.5528, zoom: 5, continent: 'North America', capital: 'Mexico City' },
  { name: 'Colombia', code: 'CO', flag: '🇨🇴', lat: 4.5709, lng: -74.2973, zoom: 5, continent: 'South America', capital: 'Bogota' },
  { name: 'Peru', code: 'PE', flag: '🇵🇪', lat: -9.1900, lng: -75.0152, zoom: 5, continent: 'South America', capital: 'Lima', polarNote: 'Machu Picchu Base' },
  { name: 'Switzerland', code: 'CH', flag: '🇨🇭', lat: 46.8182, lng: 8.2275, zoom: 7, continent: 'Europe', capital: 'Bern', polarNote: 'Alpine Cryosphere Center' },
  { name: 'Austria', code: 'AT', flag: '🇦🇹', lat: 47.5162, lng: 14.5501, zoom: 6, continent: 'Europe', capital: 'Vienna' },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', lat: 52.1326, lng: 5.2913, zoom: 6, continent: 'Europe', capital: 'Amsterdam' },
  { name: 'Belgium', code: 'BE', flag: '🇧🇪', lat: 50.5039, lng: 4.4699, zoom: 7, continent: 'Europe', capital: 'Brussels', polarNote: 'Princess Elisabeth Base' },
  { name: 'Portugal', code: 'PT', flag: '🇵🇹', lat: 39.3999, lng: -8.2245, zoom: 6, continent: 'Europe', capital: 'Lisbon' },
  { name: 'Greece', code: 'GR', flag: '🇬🇷', lat: 39.0742, lng: 21.8243, zoom: 6, continent: 'Europe', capital: 'Athens' },
  { name: 'Ireland', code: 'IE', flag: '🇮🇪', lat: 53.1424, lng: -7.6921, zoom: 6, continent: 'Europe', capital: 'Dublin' },
]

/* Marker colours. These are CSS variables from src/index.css rather than
   hex codes, so the map automatically matches the rest of the palette —
   and each one deliberately mirrors the badge tone in src/lib/statuses.js,
   which is why the legend swatches match the badges elsewhere. */
const SITE_COLOUR = {
  STATION: 'var(--ice)',
  CAMP: 'var(--blue)',
  VESSEL: 'var(--violet)',
  RUNWAY: 'var(--amber)',
  PORT: 'var(--ink-mid)',
  DEPOT: 'var(--ink-mid)',
  HQ: 'var(--green)',
}

const PERSON_COLOUR = {
  ACTIVE: 'var(--green)',
  IN_TRANSIT: 'var(--ice)',
  RESTING: 'var(--blue)',
  EMERGENCY: 'var(--red)',
  OFF_DUTY: 'var(--ink-low)',
}

/* The camera presets. These only move the VIEW — every marker stays on
   the map whichever one you pick. */
const REGIONS = [
  { key: 'ALL', label: 'All theatres' },
  { key: 'ANTARCTIC', label: 'Antarctic' },
  { key: 'ARCTIC', label: 'Arctic' },
  { key: 'SUPPORT', label: 'Transit & support' },
]

/** Which theatre a latitude belongs to. Deliberately crude — it only
    decides where the camera flies, never what the data says. */
function regionOf(lat) {
  if (lat <= -55) return 'ANTARCTIC'
  if (lat >= 60) return 'ARCTIC'
  return 'SUPPORT'
}

/** Guards against a bad coordinate silently drawing a marker at 0,0. */
function hasCoords(x) {
  return Number.isFinite(Number(x?.latitude)) && Number.isFinite(Number(x?.longitude))
}

/** Spreads out multiple personnel sharing identical coordinates into a small legible ring so every marker remains clickable. */
function spreadPositions(people) {
  const groups = new Map()
  people.forEach((person) => {
    const key = `${person.latitude},${person.longitude}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(person)
  })

  const positions = new Map()
  groups.forEach((members) => {
    members.forEach((person, index) => {
      const lat = Number(person.latitude)
      const lng = Number(person.longitude)

      if (members.length === 1) {
        positions.set(person.id, [lat, lng])
        return
      }

      const angle = (index / members.length) * Math.PI * 2
      const radius = 0.018
      const lngScale = 1 / Math.max(0.15, Math.cos((lat * Math.PI) / 180))

      positions.set(person.id, [
        lat + Math.cos(angle) * radius,
        lng + Math.sin(angle) * radius * lngScale,
      ])
    })
  })

  return positions
}

const GPS_STALE_MS = 5 * 60 * 1000

function gpsState(person) {
  if (!person?.gps_source || person.gps_source !== 'DEVICE') return 'DEMO'
  const age = Date.now() - new Date(person.last_updated || 0).getTime()
  if (!Number.isFinite(age)) return 'NO SIGNAL'
  return age <= GPS_STALE_MS ? 'LIVE' : 'STALE'
}

function distanceMeters(a, b) {
  if (!a || !b) return Infinity
  const R = 6371000
  const lat1 = (Number(a.latitude) * Math.PI) / 180
  const lat2 = (Number(b.latitude) * Math.PI) / 180
  const dLat = lat2 - lat1
  const dLon = ((Number(b.longitude) - Number(a.longitude)) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Reverse-geocodes polar coordinates to country, sovereign jurisdiction,
    sector, and estimated terrain classification. */
export function getTerritoryInfo(lat, lng) {
  const numLat = Number(lat)
  const numLng = Number(lng)
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
    return {
      country: 'Unknown Territory',
      jurisdiction: 'Undefined Coordinates',
      sector: 'Unmapped',
      region: 'Unknown',
      terrain: 'Unknown Surface',
      theater: 'SUPPORT',
    }
  }

  // Normalize lng to -180 to 180
  let normLng = ((((numLng + 180) % 360) + 360) % 360) - 180

  // 1. ANTARCTICA (south of 60°S) — Antarctic Treaty System
  if (numLat <= -60) {
    let sector = 'Antarctic Continental Ice Sheet'
    let region = 'Antarctica'
    let terrain = 'Glacial Ice Sheet / Polar Plateau'

    if (numLat <= -85) {
      sector = 'South Pole Polar Plateau (Amundsen-Scott Sector)'
      region = 'High Antarctic Plateau'
      terrain = 'Polar Ice Plateau (Elev. ~2,835m MSL)'
    } else if (normLng >= -20 && normLng <= 45) {
      sector = 'Queen Maud Land (Dronning Maud Land) · Princess Astrid Coast'
      region = 'East Antarctica'
      terrain = numLat > -71.2 ? 'Coastal Ice Shelf & Schirmacher Oasis' : 'Continental Glacial Slope'
    } else if (normLng > 45 && normLng <= 100) {
      sector = 'Princess Elizabeth Land · Larsemann Hills & Prydz Bay'
      region = 'East Antarctica'
      terrain = numLat > -70.2 ? 'Coastal Gneiss Hills & Polynyas' : 'Glacial Ice Sheet'
    } else if (normLng > 100 && normLng <= 160) {
      sector = 'Wilkes Land / Terre Adélie Sector'
      region = 'East Antarctica'
      terrain = 'Polar Ice Margin & Coastal Shelf'
    } else if (normLng > 160 || normLng <= -150) {
      sector = 'Ross Dependency / Ross Ice Shelf & Victoria Land'
      region = 'Transantarctic Mountains / Ross Sector'
      terrain = 'Floating Ice Shelf / Transantarctic Ridges'
    } else if (normLng > -150 && normLng <= -90) {
      sector = 'Marie Byrd Land / Ellsworth Land'
      region = 'West Antarctica'
      terrain = 'Subglacial Trench & Continental Ice'
    } else if (normLng > -90 && normLng <= -50) {
      sector = 'Antarctic Peninsula / Graham Land / Palmer Land'
      region = 'Antarctic Peninsula'
      terrain = 'Maritime Alpine Glaciers & Coastal Fjords'
    } else if (normLng > -50 && normLng < -20) {
      sector = 'Coats Land / Weddell Sea & Ronne Ice Shelf'
      region = 'Weddell Sea Sector'
      terrain = 'Perennial Pack Ice & Glacial Barrier'
    }

    return {
      country: 'Antarctica (Treaty Area)',
      jurisdiction: 'Antarctic Treaty System (International Scientific Zone)',
      sector,
      region,
      terrain,
      theater: 'ANTARCTIC',
    }
  }

  // 2. SOUTHERN OCEAN & SUB-ANTARCTIC (-60°S to -40°S)
  if (numLat > -60 && numLat <= -40) {
    let sector = 'Southern Ocean Circumpolar Corridor'
    let terrain = 'Pelagic High-Latitude Deep Ocean'

    if (normLng >= -75 && normLng <= -50) {
      sector = 'Drake Passage & Scotia Sea'
      terrain = 'Turbulent High-Latitude Ocean Trench'
    } else if (normLng >= 60 && normLng <= 80 && numLat >= -52 && numLat <= -46) {
      sector = 'Kerguelen Oceanic Plateau Sector'
      terrain = 'Sub-Antarctic Marine Oceanic Plateau'
    } else if (normLng >= 25 && normLng <= 45 && numLat >= -50 && numLat <= -44) {
      sector = 'Prince Edward & Marion Islands Maritime Zone'
      terrain = 'Sub-Antarctic Oceanic Waters'
    }

    return {
      country: 'Southern Ocean (High Seas)',
      jurisdiction: 'International Maritime Waters (CCAMLR Treaty Area)',
      sector,
      region: 'Southern Ocean',
      terrain,
      theater: 'SUPPORT',
    }
  }

  // 3. ARCTIC (north of 60°N)
  if (numLat >= 60) {
    if (numLat >= 74 && numLat <= 81 && normLng >= 10 && normLng <= 35) {
      return {
        country: 'Norway (Svalbard)',
        jurisdiction: 'Kingdom of Norway (Svalbard Treaty 1920) · Ny-Ålesund Science Village',
        sector: 'Spitsbergen / Kongsfjorden (Himadri Base Sector)',
        region: 'Arctic — Svalbard Archipelago',
        terrain: 'High Arctic Fjord, Glacial Moraine & Tundra',
        theater: 'ARCTIC',
      }
    }
    if (numLat >= 60 && numLat <= 84 && normLng >= -75 && normLng <= -12) {
      return {
        country: 'Greenland (Denmark)',
        jurisdiction: 'Autonomous Territory of Greenland (Kingdom of Denmark)',
        sector: 'Greenland Ice Sheet & Coastal Fjords',
        region: 'Arctic — Greenland',
        terrain: 'Glacial Ice Sheet / Permafrost Coastal Fjord',
        theater: 'ARCTIC',
      }
    }
    if (numLat >= 60 && numLat <= 72 && normLng >= -170 && normLng <= -140) {
      return {
        country: 'United States (Alaska)',
        jurisdiction: 'State of Alaska (North Slope)',
        sector: 'Alaska Arctic Coastal Plain / Beaufort Sea',
        region: 'Arctic — Alaska',
        terrain: 'Coastal Tundra & Permafrost Basin',
        theater: 'ARCTIC',
      }
    }
    if (numLat >= 60 && numLat <= 84 && normLng >= -140 && normLng <= -60) {
      return {
        country: 'Canada',
        jurisdiction: 'Territories of Nunavut & Northwest Territories',
        sector: 'Canadian Arctic Archipelago / Northwest Passage',
        region: 'Arctic — Canada',
        terrain: 'Arctic Archipelago & Tundra Plains',
        theater: 'ARCTIC',
      }
    }
    if (numLat >= 60 && normLng >= 30 && normLng <= 180) {
      return {
        country: 'Russian Federation',
        jurisdiction: 'Russian Federal Arctic Territory',
        sector: 'Siberian Arctic Coast & High Arctic Islands',
        region: 'Arctic — Russia',
        terrain: 'Taiga-Tundra Transition & Arctic Shelf',
        theater: 'ARCTIC',
      }
    }
    if (numLat >= 63 && numLat <= 67 && normLng >= -25 && normLng <= -13) {
      return {
        country: 'Iceland',
        jurisdiction: 'Republic of Iceland',
        sector: 'Icelandic High Latitude Zone',
        region: 'North Atlantic',
        terrain: 'Volcanic Plateau & Glacial Field',
        theater: 'ARCTIC',
      }
    }

    return {
      country: 'Arctic Ocean (High Arctic)',
      jurisdiction: 'International Arctic Marine Waters (UNCLOS High Seas)',
      sector: 'Central Arctic Ocean Drift Pack Ice',
      region: 'High Arctic',
      terrain: 'Perennial Multi-year Sea Ice Pack',
      theater: 'ARCTIC',
    }
  }

  // 4. STAGING NATIONS & GLOBAL MARITIME
  // India
  if (numLat >= 6 && numLat <= 37 && normLng >= 68 && normLng <= 98) {
    let sector = 'India Mainland'
    if (numLat >= 14.5 && numLat <= 16 && normLng >= 73.5 && normLng <= 74.5) {
      sector = 'Goa · NCPOR Headquarters (Mission Operations Control)'
    } else if (numLat >= 18 && numLat <= 20 && normLng >= 72 && normLng <= 73.5) {
      sector = 'Maharashtra · Mumbai Staging & Naval Gateway'
    } else if (numLat >= 28 && numLat <= 29 && normLng >= 76.5 && normLng <= 77.5) {
      sector = 'New Delhi · Ministry of Earth Sciences Headquarters'
    }
    return {
      country: 'India',
      jurisdiction: 'Republic of India · Ministry of Earth Sciences',
      sector,
      region: 'South Asia (Expedition Command Origin)',
      terrain: 'Coastal & Continental Landmass',
      theater: 'SUPPORT',
    }
  }

  // South Africa
  if (numLat >= -35 && numLat <= -22 && normLng >= 16 && normLng <= 33) {
    let sector = 'South Africa Continental Zone'
    if (numLat <= -33 && normLng <= 19) {
      sector = 'Cape Town · Antarctic Staging Port & Maritime Depot'
    }
    return {
      country: 'South Africa',
      jurisdiction: 'Republic of South Africa',
      sector,
      region: 'Southern Africa (Antarctic Gateway)',
      terrain: 'Coastal Port / Continental Landmass',
      theater: 'SUPPORT',
    }
  }

  // Indian Ocean
  if (numLat > -40 && numLat < 25 && normLng >= 35 && normLng <= 105) {
    return {
      country: 'Indian Ocean (High Seas)',
      jurisdiction: 'International Maritime Waters (UNCLOS)',
      sector: 'Indian Ocean Maritime Corridor (ORV Sagar Nidhi Sector)',
      region: 'Indian Ocean',
      terrain: 'Open Deep Ocean',
      theater: 'SUPPORT',
    }
  }

  // Atlantic Ocean
  if (normLng >= -60 && normLng <= 20) {
    return {
      country: 'Atlantic Ocean (High Seas)',
      jurisdiction: 'International Maritime Waters (UNCLOS)',
      sector: numLat < 0 ? 'South Atlantic Ocean Transit Corridor' : 'North Atlantic Basin',
      region: 'Atlantic Ocean',
      terrain: 'Open Deep Ocean',
      theater: 'SUPPORT',
    }
  }

  // Pacific Ocean
  if (normLng < -60 || normLng > 105) {
    return {
      country: 'Pacific Ocean (High Seas)',
      jurisdiction: 'International Maritime Waters (UNCLOS)',
      sector: numLat < 0 ? 'South Pacific Ocean Basin' : 'North Pacific Basin',
      region: 'Pacific Ocean',
      terrain: 'Open Deep Ocean',
      theater: 'SUPPORT',
    }
  }

  return {
    country: 'International Geographic Coordinate',
    jurisdiction: 'Global Geodetic Coordinate Space (WGS-84)',
    sector: `${numLat >= 0 ? 'Northern' : 'Southern'} Hemisphere Sector`,
    region: 'Global Operations Area',
    terrain: 'Terrestrial / Maritime Surface',
    theater: 'SUPPORT',
  }
}

/** Calculates great-circle distance and cardinal bearing to nearest polar station/base. */
export function getNearestBase(lat, lng, locations) {
  if (!locations || !locations.length) return null
  let best = null
  let minDistance = Infinity

  const lat1 = (Number(lat) * Math.PI) / 180
  const lng1 = (Number(lng) * Math.PI) / 180

  for (const loc of locations) {
    if (!Number.isFinite(Number(loc.latitude)) || !Number.isFinite(Number(loc.longitude))) continue
    const lat2 = (Number(loc.latitude) * Math.PI) / 180
    const lng2 = (Number(loc.longitude) * Math.PI) / 180

    const dLat = lat2 - lat1
    const dLng = lng2 - lng1
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const dKm = 6371 * c

    if (dKm < minDistance) {
      minDistance = dKm
      const y = Math.sin(dLng) * Math.cos(lat2)
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
      let bearing = (Math.atan2(y, x) * 180) / Math.PI
      bearing = (bearing + 360) % 360

      const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
      const dirIndex = Math.round(bearing / 22.5) % 16

      best = {
        name: loc.name,
        type: loc.type,
        distanceKm: Math.round(dKm),
        bearingDeg: Math.round(bearing),
        bearingCardinal: directions[dirIndex],
        id: loc.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
      }
    }
  }
  return best
}

/** Builds one of our HTML markers. `colour` and `shape` are always
    values from the constants above — never anything typed by a user. */
function pinIcon(shape, colour, size, isSelected) {
  if (shape === 'current-location') {
    return L.divIcon({
      className: '',
      html: `
        <div class="map-pin--current-location${isSelected ? ' map-pin--selected' : ''}">
          <div class="map-pin--current-location-core"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
  }

  if (shape === 'custom-point') {
    return L.divIcon({
      className: '',
      html: `
        <div class="map-pin--custom-point${isSelected ? ' map-pin--selected' : ''}">
          <div class="map-pin--custom-point-reticle"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
  }

  return L.divIcon({
    /* An empty className stops Leaflet adding its own .leaflet-div-icon,
       which would draw a white box behind our shape. */
    className: '',
    html: `<div class="map-pin map-pin--${shape}${isSelected ? ' map-pin--selected' : ''}"${
      colour ? ` style="background:${colour}"` : ''
    }></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** Leaflet accepts a DOM node for tooltips. Using textContent rather than
    an HTML string means a record's text can never be treated as markup. */
function textTooltip(text) {
  const node = document.createElement('span')
  node.textContent = text
  return node
}

/* ============================================================
   THE PAGE
   ============================================================ */

export default function MapView({ goTo }) {
  const {
    locations,
    expeditions,
    personnel,
    emergencies,
    loading,
    error,
    getPerson,
    getLocation,
    getExpedition,
    recordPersonnelLocation,
    databaseConfigured,
  } = useData()

  /* Which camera preset is active. */
  const [region, setRegion] = useState('ALL')

  /* Which expedition filter is active: 'ALL' or expedition_id */
  const [selectedExpedition, setSelectedExpedition] = useState('ALL')

  /* Deployment list sub-view: 'EXPEDITIONS' or 'SITES' */
  const [deploymentView, setDeploymentView] = useState('EXPEDITIONS')

  /* Which marker layers are switched on. */
  const [show, setShow] = useState({ sites: true, people: true, incidents: true, routes: true })

  /* Inspect Coordinate Survey Mode */
  const [inspectMode, setInspectMode] = useState(false)

  /* What is open in the detail panel: { kind: 'site'|'person'|'incident'|'current_location', id }. */
  const [selected, setSelected] = useState(null)
  const [trackingPersonnelId, setTrackingPersonnelId] = useState('')
  const [showTrail, setShowTrail] = useState(true)
  const [trail, setTrail] = useState([])
  const [trailError, setTrailError] = useState(null)
  const [devicePosition, setDevicePosition] = useState(null)
  const [deviceError, setDeviceError] = useState(null)
  const lastSavedPositionRef = useRef(null)
  const lastSavedAtRef = useRef(0)
  const { position: gpsPosition, error: gpsError, tracking, permission, start, stop, locateOnce } = useGeolocation()

  /* Workstation / Browser GPS Telemetry State */
  const [gpsStatus, setGpsStatus] = useState('OFFLINE')
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState(null)
  const [toast, setToast] = useState(null)
  const markersMapRef = useRef(new Map())
  const markerClickedRef = useRef(false)
  const customPointMarkerRef = useRef(null)
  const userLocationMarkerRef = useRef(null)
  const routesLayerRef = useRef(null)

  /* Auto-dismiss toast notification */
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  /* Custom Arbitrary Point Inspection (Drop survey pin anywhere on map) */
  const [customPoint, setCustomPoint] = useState(null)
  const locationsRef = useRef(locations)
  useEffect(() => {
    locationsRef.current = locations
  }, [locations])

  /* Copy coordinate helper with toast feedback */
  const handleCopyCoords = (lat, lng, label = 'Coordinates') => {
    const text = `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setToast({ type: 'success', message: `Copied ${label} coordinates: ${text}` })
      }).catch(() => {
        setToast({ type: 'info', message: `${label}: ${text}` })
      })
    } else {
      setToast({ type: 'info', message: `${label}: ${text}` })
    }
  }

  /* Set to true once the Leaflet map exists, so the marker-drawing effect
     below knows it is safe to run. */
  const [mapReady, setMapReady] = useState(false)

  const containerRef = useRef(null)
  const mapRef = useRef(null)

  /* View Mode & Map Basemap: Default to 2D Map with National Geographic Physical Atlas style */
  const [viewMode, setViewMode] = useState('2D') // '2D' default
  const [activeMapStyle, setActiveMapStyle] = useState('NATGEO') // 'NATGEO' physical atlas default
  const [isPerspectiveTilt, setIsPerspectiveTilt] = useState(false)
  const [mapMinimized, setMapMinimized] = useState(true) // Minimized compact map height by default
  const tileLayerRef = useRef(null)

  /* Search Country State (matching reference photo) */
  const [searchCountryQuery, setSearchCountryQuery] = useState('')
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false)

  /* Filtered country suggestions */
  const countrySuggestions = useMemo(() => {
    if (!searchCountryQuery.trim()) return []
    const q = searchCountryQuery.trim().toLowerCase()
    return WORLD_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.continent.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q ||
        (c.polarNote && c.polarNote.toLowerCase().includes(q))
    ).slice(0, 8)
  }, [searchCountryQuery])

  /* Select country from search suggestion */
  const handleSelectCountry = (country) => {
    setSearchCountryQuery(country.name)
    setShowCountrySuggestions(false)

    const lat = country.lat
    const lng = country.lng
    const zoom = country.zoom || 5

    const territoryInfo = getTerritoryInfo(lat, lng)
    const nearestBase = getNearestBase(lat, lng, locationsRef.current)

    const pointData = {
      lat,
      lng,
      territoryInfo: {
        ...territoryInfo,
        country: `${country.flag ? country.flag + ' ' : ''}${country.name}`,
        region: country.continent,
        capital: country.capital,
        polarRole: country.polarNote,
      },
      nearestBase,
      timestamp: new Date().toISOString(),
    }

    setCustomPoint(pointData)
    setSelected({
      kind: 'custom_point',
      id: `country_${country.code || country.name}`,
      pointData,
    })

    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], zoom, { duration: 1.5 })
    }
  }

  /* Submit search on enter */
  const handleSearchSubmit = async () => {
    if (!searchCountryQuery.trim()) return
    const q = searchCountryQuery.trim().toLowerCase()
    const matched = WORLD_COUNTRIES.find(
      (c) =>
        c.name.toLowerCase() === q ||
        c.name.toLowerCase().startsWith(q) ||
        c.code?.toLowerCase() === q
    )
    if (matched) {
      handleSelectCountry(matched)
      return
    }

    // Live geocoding fallback
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchCountryQuery)}&limit=1`
      )
      const data = await res.json()
      if (data && data.length > 0) {
        const item = data[0]
        const lat = parseFloat(item.lat)
        const lng = parseFloat(item.lon)
        const territoryInfo = getTerritoryInfo(lat, lng)
        const nearestBase = getNearestBase(lat, lng, locationsRef.current)
        const pointData = {
          lat,
          lng,
          territoryInfo: {
            ...territoryInfo,
            country: item.display_name.split(',')[0],
          },
          nearestBase,
          timestamp: new Date().toISOString(),
        }
        setCustomPoint(pointData)
        setSelected({
          kind: 'custom_point',
          id: 'survey_point',
          pointData,
        })
        setShowCountrySuggestions(false)
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 5, { duration: 1.5 })
        }
      }
    } catch (err) {
      console.warn('Geocoding search failed:', err)
    }
  }

  /* Invalidate Leaflet sizing when switching to 2D view or toggling minimize */
  useEffect(() => {
    if (viewMode === '2D' && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [viewMode, mapMinimized])

  /* Arbitrary point click handler for 3D Globe */
  const handleSelectCustomPoint = (lat, lng) => {
    const numLat = Number(lat)
    const numLng = Number(lng)
    const territoryInfo = getTerritoryInfo(numLat, numLng)
    const nearestBase = getNearestBase(numLat, numLng, locationsRef.current)

    const pointData = {
      lat: numLat,
      lng: numLng,
      territoryInfo,
      nearestBase,
      timestamp: new Date().toISOString(),
    }

    setCustomPoint(pointData)
    setSelected({
      kind: 'custom_point',
      id: 'survey_point',
      pointData,
    })
  }

  /* ---------- WHAT GOES ON THE MAP ---------- */
  const sites = useMemo(() => locations.filter(hasCoords), [locations])
  const people = useMemo(
    () =>
      personnel
        .filter(hasCoords)
        .filter((p) => selectedExpedition === 'ALL' || p.expedition_id === selectedExpedition),
    [personnel, selectedExpedition]
  )
  const openIncidents = useMemo(
    () =>
      emergencies
        .filter((e) => e.status !== 'RESOLVED' && hasCoords(e))
        .filter((e) => {
          if (selectedExpedition === 'ALL') return true
          if (e.expedition_id === selectedExpedition) return true
          const casualty = personnel.find((p) => p.id === e.personnel_id)
          return casualty?.expedition_id === selectedExpedition
        }),
    [emergencies, selectedExpedition, personnel]
  )
  const personPositions = useMemo(() => spreadPositions(people), [people])

  /* Browser Geolocation Handler ("Locate Me") */
  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      const msg = 'Browser Geolocation is not supported on this device.'
      setGpsStatus('UNAVAILABLE')
      setGeoError(msg)
      setToast({ type: 'error', message: msg })
      return
    }

    setLocating(true)
    setGpsStatus('LOCATING')
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const loc = {
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          timestamp: new Date().toISOString(),
        }

        setUserLocation(loc)
        setGpsStatus('ACTIVE / LOCATED')
        setLocating(false)
        setToast({
          type: 'success',
          message: `GPS Fix Acquired: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}° (±${Math.round(accuracy)}m)`,
        })

        setSelected({ kind: 'current_location', id: 'active_workstation' })

        const map = mapRef.current
        if (map) {
          map.flyTo([latitude, longitude], 14, { duration: 1.5 })
          setTimeout(() => {
            const marker = markersMapRef.current?.get('current_location-active_workstation')
            if (marker) marker.openPopup()
          }, 400)
        }
      },
      (err) => {
        setLocating(false)
        let msg = 'Could not acquire location fix.'
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location access was denied. Please allow location permissions in your browser.'
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable from your device.'
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please try again.'
        }
        setGpsStatus('OFFLINE')
        setGeoError(msg)
        setToast({ type: 'error', message: msg })
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    )
  }

  const handleClearLocation = () => {
    setUserLocation(null)
    setGpsStatus('OFFLINE')
    if (selected?.kind === 'current_location') {
      setSelected(null)
    }
  }

  /* Automatically flies the camera to coordinates and opens popup card */
  const flyToEntity = (kind, id, lat, lng, zoom = 14) => {
    setSelected({ kind, id })
    const map = mapRef.current
    if (map && Number.isFinite(lat) && Number.isFinite(lng)) {
      map.flyTo([lat, lng], zoom, { duration: 1.5 })
      const key = `${kind}-${id}`
      setTimeout(() => {
        const marker = markersMapRef.current?.get(key)
        if (marker) {
          marker.openPopup()
        }
      }, 400)
    }
  }

  /* Persist only the selected person's device GPS. watchPosition remains
     active, but writes are throttled to avoid flooding Supabase. */
  useEffect(() => {
    if (!gpsPosition || !tracking || !trackingPersonnelId) return
    const now = Date.now()
    const moved = distanceMeters(lastSavedPositionRef.current, gpsPosition)
    if (now - lastSavedAtRef.current < 5000 && moved < 20) return
    lastSavedPositionRef.current = gpsPosition
    lastSavedAtRef.current = now
    recordPersonnelLocation(trackingPersonnelId, gpsPosition).catch(() => {})
  }, [gpsPosition, tracking, trackingPersonnelId, recordPersonnelLocation])

  useEffect(() => {
    if (!tracking) return
    const onOnline = () => {
      if (!gpsPosition || !trackingPersonnelId) return
      lastSavedAtRef.current = 0
      recordPersonnelLocation(trackingPersonnelId, gpsPosition).catch(() => {})
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [tracking, gpsPosition, trackingPersonnelId, recordPersonnelLocation])

  useEffect(() => {
    if (!selected || selected.kind !== 'person' || !showTrail) {
      setTrail([])
      return
    }
    let cancelled = false
    setTrailError(null)
    fetchLocationHistory(selected.id, 200).then((result) => {
      if (cancelled) return
      if (result.error) {
        setTrailError(result.error)
        setTrail([])
      } else {
        setTrail([...result.rows].reverse())
      }
    })
    return () => { cancelled = true }
  }, [selected, showTrail])

  /* ---------- EFFECT 1: CREATE THE MAP (once) ---------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined

    const map = L.map(containerRef.current, {
      center: [20, 10], // Worldwide perspective centered on Africa/Atlantic/Asia
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      /* Continuous infinite horizontal scrolling in all directions */
      worldCopyJump: true,
      zoomControl: true,
    })

    const initialStyle = MAP_STYLES[activeMapStyle] || MAP_STYLES.NATGEO
    const baseLayer = createContinuousTileLayer(initialStyle.url, {
      className: initialStyle.className,
      attribution: initialStyle.attribution,
      minZoom: 2,
      maxZoom: initialStyle.maxZoom || 18,
      noWrap: false,
    }).addTo(map)
    tileLayerRef.current = baseLayer


    /* Interactive popup buttons: delegate clicks to React goTo navigation */
    map.on('popupopen', (e) => {
      const popupNode = e.popup?.getElement()
      if (!popupNode) return
      const btns = popupNode.querySelectorAll('[data-action]')
      btns.forEach((btn) => {
        btn.onclick = (evt) => {
          evt.preventDefault()
          evt.stopPropagation()
          const action = btn.getAttribute('data-action')
          const target = btn.getAttribute('data-target')
          if (action === 'goto' && target && goTo) {
            goTo(target)
          }
        }
      })
    })

    /* Clicking on empty map space deselects cleanly, or inspects if in inspect mode */
    map.on('click', (e) => {
      if (markerClickedRef.current) return

      if (inspectMode || e.originalEvent?.shiftKey) {
        const lat = Number(e.latlng.lat)
        const lng = Number(e.latlng.lng)
        const territoryInfo = getTerritoryInfo(lat, lng)
        const nearestBase = getNearestBase(lat, lng, locationsRef.current)

        const pointData = {
          lat,
          lng,
          territoryInfo,
          nearestBase,
          timestamp: new Date().toISOString(),
        }

        setCustomPoint(pointData)
        setSelected({
          kind: 'custom_point',
          id: 'survey_point',
          pointData,
        })
      } else {
        // Clean deselection on empty map space
        setSelected(null)
        setCustomPoint(null)
        map.closePopup()
      }
    })

    mapRef.current = map
    setMapReady(true)

    const nudge = setTimeout(() => map.invalidateSize(), 0)

    return () => {
      clearTimeout(nudge)
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [goTo, inspectMode])

  /* Dynamic basemap layer switching */
  useEffect(() => {
    if (!mapRef.current) return
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current)
    }
    const style = MAP_STYLES[activeMapStyle] || MAP_STYLES.NATGEO
    const newLayer = createContinuousTileLayer(style.url, {
      className: style.className,
      attribution: style.attribution,
      minZoom: 2,
      maxZoom: style.maxZoom || 18,
      noWrap: false,
    }).addTo(mapRef.current)
    newLayer.bringToBack()
    tileLayerRef.current = newLayer

    const container = mapRef.current.getContainer()
    if (container) {
      container.style.backgroundColor = style.background || '#7eaec9'
    }
  }, [activeMapStyle, mapReady])

  /* ---------- EFFECT 2: DRAW THE STABLE MARKERS & CORRIDORS ----------
     Independent of selection so clicking a marker does NOT destroy or recreate the layer! */
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return undefined

    const layer = L.layerGroup().addTo(map)

    /* --- operational corridors & traverse routes --- */
    if (show.routes) {
      OPERATIONAL_ROUTES.forEach((r) => {
        const poly = L.polyline(r.points, {
          color: r.color,
          dashArray: r.dashArray,
          weight: r.weight,
          opacity: 0.85,
        })
        poly.bindTooltip(
          textTooltip(`${r.name} (${r.fromName} → ${r.toName})`),
          { sticky: true }
        )
        poly.addTo(layer)
      })
    }

    /* --- sites --- */
    if (show.sites) {
      sites.forEach((site) => {
        const marker = L.marker([Number(site.latitude), Number(site.longitude)], {
          icon: pinIcon('site', SITE_COLOUR[site.type] || 'var(--ink-mid)', 12, false),
        })
        const siteTerritory = getTerritoryInfo(site.latitude, site.longitude)
        marker.bindTooltip(
          textTooltip(`${site.name} · ${statusLabel(LOCATION_TYPE, site.type)} (${siteTerritory.country})`),
          { direction: 'top', offset: [0, -8] }
        )
        const stationedList = personnel.filter((p) => p.location_id === site.id)
        marker.bindPopup(buildSitePopup(site, stationedList.length, siteTerritory, stationedList), {
          className: 'polar-map-popup',
        })
        marker.on('click', (e) => {
          if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent)
          markerClickedRef.current = true
          setTimeout(() => { markerClickedRef.current = false }, 300)
          setSelected({ kind: 'site', id: site.id })
        })
        marker.addTo(layer)
        markersMapRef.current.set(`site-${site.id}`, marker)
      })
    }

    /* --- personnel --- */
    if (show.people) {
      const ordered = [...people].sort(
        (a, b) => (a.status === 'EMERGENCY' ? 1 : 0) - (b.status === 'EMERGENCY' ? 1 : 0)
      )

      ordered.forEach((person) => {
        const position = personPositions.get(person.id)
        if (!position) return

        const marker = L.marker(position, {
          icon: pinIcon('person', PERSON_COLOUR[person.status] || 'var(--ink-low)', 9, false),
          zIndexOffset: person.status === 'EMERGENCY' ? 500 : 0,
        })
        const personTerritory = getTerritoryInfo(position[0], position[1])
        marker.bindTooltip(
          textTooltip(`${person.name} · ${statusLabel(PERSONNEL_STATUS, person.status)} · ${personTerritory.country}`),
          { direction: 'top', offset: [0, -7] }
        )
        const loc = getLocation(person.location_id)
        const expedition = getExpedition(person.expedition_id)
        const emergencyAlert = emergencies.find(
          (e) => e.status !== 'RESOLVED' && e.personnel_id === person.id
        )

        marker.bindPopup(buildPersonPopup(person, position, personTerritory, loc, expedition, emergencyAlert), {
          className: 'polar-map-popup',
        })
        marker.on('click', (e) => {
          if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent)
          markerClickedRef.current = true
          setTimeout(() => { markerClickedRef.current = false }, 300)
          setSelected({ kind: 'person', id: person.id })
        })
        marker.addTo(layer)
        markersMapRef.current.set(`person-${person.id}`, marker)
      })
    }

    /* --- open incidents --- */
    if (show.incidents) {
      openIncidents.forEach((incident) => {
        const marker = L.marker([Number(incident.latitude), Number(incident.longitude)], {
          icon: pinIcon('incident', null, 20, false),
          zIndexOffset: 1000,
        })
        const incidentTerritory = getTerritoryInfo(incident.latitude, incident.longitude)
        marker.bindTooltip(
          textTooltip(`${incident.id} · ${statusLabel(EMERGENCY_TYPE, incident.type)} (${incidentTerritory.country})`),
          { direction: 'top', offset: [0, -12] }
        )
        const casualty = incident.personnel_id ? getPerson(incident.personnel_id) : null
        marker.bindPopup(buildIncidentPopup(incident, incidentTerritory, casualty), {
          className: 'polar-map-popup',
        })
        marker.on('click', (e) => {
          if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent)
          markerClickedRef.current = true
          setTimeout(() => { markerClickedRef.current = false }, 300)
          setSelected({ kind: 'incident', id: incident.id })
        })
        marker.addTo(layer)
        markersMapRef.current.set(`incident-${incident.id}`, marker)
      })
    }

    return () => {
      layer.remove()
    }
  }, [mapReady, sites, people, openIncidents, personPositions, show, personnel, getLocation, getExpedition, getPerson, emergencies])

  /* ---------- EFFECT 2B: SYNC SELECTED HALO WITHOUT RE-RENDERING TILES ---------- */
  useEffect(() => {
    markersMapRef.current.forEach((marker) => {
      const el = marker.getElement()
      if (el) {
        const pin = el.querySelector('.map-pin, .map-pin--current-location, .map-pin--custom-point')
        if (pin) pin.classList.remove('map-pin--selected')
      }
    })
    if (selected) {
      const key = `${selected.kind}-${selected.id}`
      const marker = markersMapRef.current.get(key)
      if (marker) {
        const el = marker.getElement()
        if (el) {
          const pin = el.querySelector('.map-pin, .map-pin--current-location, .map-pin--custom-point')
          if (pin) pin.classList.add('map-pin--selected')
        }
      }
    }
  }, [selected])

  /* ---------- EFFECT 2C: CUSTOM SURVEY TARGET PIN ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    if (customPointMarkerRef.current) {
      map.removeLayer(customPointMarkerRef.current)
      customPointMarkerRef.current = null
      markersMapRef.current.delete('custom_point-survey_point')
    }

    if (customPoint) {
      const marker = L.marker([customPoint.lat, customPoint.lng], {
        icon: pinIcon('custom-point', null, 32, true),
        zIndexOffset: 3000,
      })
      marker.bindTooltip(
        textTooltip(`Survey Point: ${customPoint.territoryInfo.country}`),
        { direction: 'top', offset: [0, -18] }
      )
      marker.bindPopup(buildSurveyPointPopup(customPoint), { className: 'polar-map-popup' })
      marker.on('click', (e) => {
        if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent)
        markerClickedRef.current = true
        setTimeout(() => { markerClickedRef.current = false }, 300)
        setSelected({ kind: 'custom_point', id: 'survey_point', pointData: customPoint })
      })
      marker.addTo(map)
      customPointMarkerRef.current = marker
      markersMapRef.current.set('custom_point-survey_point', marker)
      marker.openPopup()
    }
  }, [mapReady, customPoint])

  /* ---------- EFFECT 2D: USER WORKSTATION PIN ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    if (userLocationMarkerRef.current) {
      map.removeLayer(userLocationMarkerRef.current)
      userLocationMarkerRef.current = null
      markersMapRef.current.delete('current_location-active_workstation')
    }

    if (userLocation) {
      const marker = L.marker([userLocation.latitude, userLocation.longitude], {
        icon: pinIcon('current-location', null, 28, selected?.kind === 'current_location'),
        zIndexOffset: 2500,
      })
      const userTerritory = getTerritoryInfo(userLocation.latitude, userLocation.longitude)
      marker.bindTooltip(textTooltip(`Workstation: ${userTerritory.country}`), {
        direction: 'top',
        offset: [0, -16],
      })
      marker.bindPopup(buildWorkstationPopup(userLocation, userTerritory), {
        className: 'polar-map-popup',
      })
      marker.on('click', (e) => {
        if (e?.originalEvent) L.DomEvent.stopPropagation(e.originalEvent)
        markerClickedRef.current = true
        setTimeout(() => { markerClickedRef.current = false }, 300)
        setSelected({ kind: 'current_location', id: 'active_workstation' })
      })
      marker.addTo(map)
      userLocationMarkerRef.current = marker
      markersMapRef.current.set('current_location-active_workstation', marker)
    }
  }, [mapReady, userLocation, selected?.kind])

  /* ---------- EFFECT 2E: GPS TRAIL POLYLINE ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    if (!showTrail || selected?.kind !== 'person' || trail.length < 2) return

    const poly = L.polyline(
      trail.map((point) => [Number(point.latitude), Number(point.longitude)]),
      {
        color: 'var(--ice)',
        weight: 3,
        opacity: 0.8,
        dashArray: '5 6',
      }
    ).addTo(map)

    return () => {
      map.removeLayer(poly)
    }
  }, [mapReady, showTrail, selected, trail])

  /* Device location is deliberately separate from personnel tracking. */
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map || !devicePosition) return undefined
    const layer = L.layerGroup().addTo(map)
    const marker = L.circleMarker([devicePosition.latitude, devicePosition.longitude], {
      radius: 8,
      color: 'var(--ice)',
      weight: 2,
      fillOpacity: 0.25,
    }).addTo(layer)
    marker.bindTooltip(textTooltip('YOUR DEVICE'), { direction: 'top' })
    if (Number.isFinite(Number(devicePosition.accuracy)) && Number(devicePosition.accuracy) > 0) {
      L.circle([devicePosition.latitude, devicePosition.longitude], {
        radius: Number(devicePosition.accuracy),
        color: 'var(--ice)',
        weight: 1,
        fillOpacity: 0.08,
      }).addTo(layer)
    }
    return () => layer.remove()
  }, [mapReady, devicePosition])

  /* ---------- EFFECT 3: MOVE THE CAMERA WHEN THE THEATRE OR EXPEDITION CHANGES ---------- */
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    /* Build the list of points the camera should cover, from the real
       data rather than hardcoded coordinates. */
    const points = []
    const collect = (lat, lng) => {
      if (region === 'ALL' || regionOf(lat) === region) points.push([lat, lng])
    }

    if (selectedExpedition !== 'ALL') {
      people.forEach((p) => collect(Number(p.latitude), Number(p.longitude)))
      openIncidents.forEach((e) => collect(Number(e.latitude), Number(e.longitude)))
      const targetExp = expeditions.find((e) => e.id === selectedExpedition)
      if (targetExp) {
        const destSite = locations.find(
          (l) => l.id === targetExp.location_id || l.name === targetExp.destination
        )
        if (destSite && hasCoords(destSite)) {
          collect(Number(destSite.latitude), Number(destSite.longitude))
        }
      }
    } else {
      if (show.sites) sites.forEach((s) => collect(Number(s.latitude), Number(s.longitude)))
      if (show.people) people.forEach((p) => collect(Number(p.latitude), Number(p.longitude)))
      if (show.incidents) {
        openIncidents.forEach((e) => collect(Number(e.latitude), Number(e.longitude)))
      }
    }
    if (userLocation) {
      collect(Number(userLocation.latitude), Number(userLocation.longitude))
    }

    if (!points.length) return

    map.invalidateSize()

    map.fitBounds(L.latLngBounds(points), {
      padding: [30, 30],
      maxZoom: 8,
      animate: false,
    })
  }, [mapReady, region, selectedExpedition, sites, people, openIncidents, show, expeditions, locations, userLocation])

  /* ---------- CLICKING A LIST ENTRY MOVES THE CHART THERE ---------- */
  const focusOn = (kind, id, lat, lng) => {
    flyToEntity(kind, id, Number(lat), Number(lng), 14)
  }

  /* ---------- THE DETAIL PANEL CONTENTS ----------
     Every marker type is turned into the same simple shape — a title, a
     badge, some key/value rows, and rich action options — so the panel is written once instead of
     three times. */
  const detail = useMemo(() => {
    if (!selected) return null

    if (selected.kind === 'custom_point' && customPoint) {
      const { lat, lng, territoryInfo, nearestBase } = customPoint
      return {
        kind: 'Survey Point',
        title: territoryInfo.country,
        badge: <Badge tone="warn" label="INSPECTED POINT" dot />,
        coords: formatCoords(lat, lng),
        rows: [
          { label: 'Country / Territory', value: territoryInfo.country },
          { label: 'Sector / Region', value: territoryInfo.sector },
          { label: 'Jurisdiction', value: territoryInfo.jurisdiction },
          {
            label: 'Nearest Base',
            value: nearestBase
              ? `${nearestBase.name} (${nearestBase.distanceKm} km ${nearestBase.bearingCardinal})`
              : 'None in range',
          },
          ...(nearestBase
            ? [{ label: 'Vector / Heading', value: `${nearestBase.bearingDeg}° (${nearestBase.bearingCardinal})` }]
            : []),
          { label: 'Estimated Terrain', value: territoryInfo.terrain },
          { label: 'Operational Theatre', value: territoryInfo.theater },
          { label: 'Decimal Coordinates', value: `${lat.toFixed(5)}°, ${lng.toFixed(5)}°` },
        ],
        note: 'Arbitrary survey point selected on chart. Shows nearest base vector, territory status, and terrain classification.',
        positionIsReal: true,
        options: [
          {
            label: 'Center & Zoom',
            icon: <Crosshair size={13} />,
            tone: 'ghost',
            onClick: () => {
              const map = mapRef.current
              if (map) {
                map.flyTo([lat, lng], 10, { duration: 1.5 })
                setTimeout(() => {
                  const marker = markersMapRef.current?.get('custom_point-survey_point')
                  if (marker) marker.openPopup()
                }, 400)
              }
            },
          },
          {
            label: 'Copy Coords',
            icon: <Copy size={13} />,
            tone: 'ghost',
            onClick: () => handleCopyCoords(lat, lng, 'Survey Point'),
          },
          {
            label: 'Check Weather',
            icon: <Wind size={13} />,
            tone: 'primary',
            onClick: () => goTo('weather'),
          },
          {
            label: 'Report SOS at Point',
            icon: <AlertTriangle size={13} />,
            tone: 'alert',
            onClick: () => goTo('emergency'),
          },
          {
            label: 'Clear Pin',
            icon: <X size={13} />,
            tone: 'ghost',
            onClick: () => {
              setCustomPoint(null)
              setSelected(null)
            },
          },
        ],
      }
    }

    if (selected.kind === 'current_location' && userLocation) {
      const userTerritory = getTerritoryInfo(userLocation.latitude, userLocation.longitude)
      return {
        kind: 'Workstation',
        title: 'Current Location / Active Workstation',
        badge: <Badge tone="ok" label="ACTIVE / LOCATED" dot />,
        coords: formatCoords(userLocation.latitude, userLocation.longitude),
        rows: [
          { label: 'Country / Territory', value: userTerritory.country },
          { label: 'Sector / Region', value: userTerritory.sector },
          { label: 'Jurisdiction', value: userTerritory.jurisdiction },
          { label: 'Latitude', value: `${userLocation.latitude.toFixed(6)}°` },
          { label: 'Longitude', value: `${userLocation.longitude.toFixed(6)}°` },
          { label: 'Fix Accuracy', value: `±${userLocation.accuracy} m` },
          { label: 'Fix Time', value: new Date(userLocation.timestamp).toLocaleTimeString() },
          { label: 'Sensor Status', value: 'Active / Located' },
        ],
        note: 'Live telemetry acquired from browser GPS / device sensor. Pinned as active workstation coordinate fix.',
        positionIsReal: true,
        options: [
          {
            label: 'Re-center Camera',
            icon: <Crosshair size={13} />,
            tone: 'primary',
            onClick: () => {
              const map = mapRef.current
              if (map) {
                map.flyTo([userLocation.latitude, userLocation.longitude], 14, { duration: 1.5 })
                const marker = markersMapRef.current?.get('current_location-active_workstation')
                if (marker) marker.openPopup()
              }
            },
          },
          {
            label: 'Copy Coords',
            icon: <Copy size={13} />,
            tone: 'ghost',
            onClick: () => handleCopyCoords(userLocation.latitude, userLocation.longitude, 'Workstation'),
          },
          {
            label: 'Check Weather',
            icon: <Wind size={13} />,
            tone: 'ghost',
            onClick: () => goTo('weather'),
          },
          {
            label: 'Clear Location',
            icon: <X size={13} />,
            tone: 'ghost',
            onClick: handleClearLocation,
          },
        ],
      }
    }

    if (selected.kind === 'site') {
      const site = locations.find((l) => l.id === selected.id)
      if (!site) return null

      const here = personnel.filter((p) => p.location_id === site.id)
      const siteTerritory = getTerritoryInfo(site.latitude, site.longitude)

      return {
        kind: 'Site',
        title: site.name,
        badge: <Badge map={LOCATION_TYPE} value={site.type} />,
        coords: formatCoords(site.latitude, site.longitude),
        rows: [
          { label: 'Country / Jurisdiction', value: siteTerritory.country },
          { label: 'Territory Details', value: siteTerritory.jurisdiction },
          { label: 'Sector / Region', value: site.region || siteTerritory.sector },
          { label: 'Site Type', value: statusLabel(LOCATION_TYPE, site.type) },
          { label: 'Personnel Stationed', value: `${here.length} personnel` },
          ...(site.capacity
            ? [
                {
                  label: 'Capacity',
                  value:
                    typeof site.capacity === 'object'
                      ? `${site.capacity.winter} winter / ${site.capacity.summer} summer`
                      : `${site.capacity} personnel`,
                },
              ]
            : []),
          ...(site.elevation_m != null ? [{ label: 'Elevation', value: `${site.elevation_m} m MSL` }] : []),
          { label: 'Decimal Coordinates', value: `${Number(site.latitude).toFixed(5)}°, ${Number(site.longitude).toFixed(5)}°` },
        ],
        note: site.notes,
        positionIsReal: site.type !== 'VESSEL',
        options: [
          {
            label: 'Center & Zoom',
            icon: <Crosshair size={13} />,
            tone: 'ghost',
            onClick: () => flyToEntity('site', site.id, Number(site.latitude), Number(site.longitude), 12),
          },
          {
            label: 'Copy Coords',
            icon: <Copy size={13} />,
            tone: 'ghost',
            onClick: () => handleCopyCoords(site.latitude, site.longitude, site.name),
          },
          {
            label: `View Personnel (${here.length})`,
            icon: <Users size={13} />,
            tone: here.length > 0 ? 'primary' : 'ghost',
            onClick: () => goTo('personnel'),
          },
          {
            label: 'Weather Forecast',
            icon: <Wind size={13} />,
            tone: 'ghost',
            onClick: () => goTo('weather'),
          },
          {
            label: 'Report Incident',
            icon: <AlertTriangle size={13} />,
            tone: 'alert',
            onClick: () => goTo('emergency'),
          },
        ],
      }
    }

    if (selected.kind === 'person') {
      const person = getPerson(selected.id)
      if (!person) return null

      const place = getLocation(person.location_id)
      const expedition = getExpedition(person.expedition_id)
      const pos = personPositions.get(person.id) || [Number(person.latitude), Number(person.longitude)]
      const personTerritory = getTerritoryInfo(pos[0], pos[1])

      return {
        kind: 'Personnel',
        title: person.name,
        badge: (
          <div className="flex flex-wrap justify-end gap-1">
            <Badge map={PERSONNEL_STATUS} value={person.status} dot />
            <Badge
              label={
                gpsState(person) === 'LIVE'
                  ? 'LIVE GPS'
                  : gpsState(person) === 'STALE'
                  ? 'STALE GPS'
                  : 'DEMO DATA'
              }
              tone={gpsState(person) === 'LIVE' ? 'ok' : 'warn'}
            />
          </div>
        ),
        coords: formatCoords(pos[0], pos[1]),
        rows: [
          { label: 'Country / Region', value: personTerritory.country },
          { label: 'Sector Location', value: personTerritory.sector },
          { label: 'Role / Rank', value: person.role },
          { label: 'Assigned Expedition', value: expedition ? expedition.name : '—' },
          { label: 'Stationed Base', value: place ? place.name : 'In Transit' },
          { label: 'Duty Status', value: statusLabel(PERSONNEL_STATUS, person.status) },
          { label: 'Readiness Index', value: person.readiness || '100%' },
          { label: 'GPS State', value: gpsState(person) },
          ...(gpsState(person) === 'LIVE' || gpsState(person) === 'STALE'
            ? [
                {
                  label: 'GPS Accuracy',
                  value: person.gps_accuracy != null ? `±${Math.round(Number(person.gps_accuracy))} m` : '—',
                },
                { label: 'Last Telemetry', value: timeAgo(person.last_updated) },
              ]
            : []),
          { label: 'Decimal Coordinates', value: `${pos[0].toFixed(5)}°, ${pos[1].toFixed(5)}°` },
        ],
        positionIsReal: gpsState(person) === 'LIVE' || gpsState(person) === 'STALE',
        gpsState: gpsState(person),
        options: [
          {
            label: 'Center & Zoom',
            icon: <Crosshair size={13} />,
            tone: 'ghost',
            onClick: () => flyToEntity('person', person.id, pos[0], pos[1], 14),
          },
          {
            label: 'Copy Coords',
            icon: <Copy size={13} />,
            tone: 'ghost',
            onClick: () => handleCopyCoords(pos[0], pos[1], person.name),
          },
          {
            label: 'Open Personnel',
            icon: <Users size={13} />,
            tone: 'primary',
            onClick: () => goTo('personnel'),
          },
          {
            label: 'Report SOS',
            icon: <AlertTriangle size={13} />,
            tone: 'alert',
            onClick: () => goTo('emergency'),
          },
          {
            label: 'Check Weather',
            icon: <Wind size={13} />,
            tone: 'ghost',
            onClick: () => goTo('weather'),
          },
        ],
      }
    }

    const incident = emergencies.find((e) => e.id === selected.id)
    if (!incident) return null

    const casualty = incident.personnel_id ? getPerson(incident.personnel_id) : null
    const incidentTerritory = getTerritoryInfo(incident.latitude, incident.longitude)

    return {
      kind: 'Incident',
      title: statusLabel(EMERGENCY_TYPE, incident.type),
      badge: <Badge map={EMERGENCY_STATUS} value={incident.status} dot />,
      coords: formatCoords(incident.latitude, incident.longitude),
      rows: [
        { label: 'Country / Region', value: incidentTerritory.country },
        { label: 'Territory Sector', value: incidentTerritory.sector },
        { label: 'Reference ID', value: incident.id },
        { label: 'Severity Level', value: statusLabel(SEVERITY, incident.severity) },
        { label: 'Time Reported', value: timeAgo(incident.reported_at) },
        { label: 'Location Name', value: incident.location },
        ...(casualty ? [{ label: 'Casualty / Operative', value: casualty.name }] : []),
        ...(incident.assigned_team ? [{ label: 'Responding Team', value: incident.assigned_team }] : []),
        { label: 'Decimal Coordinates', value: `${Number(incident.latitude).toFixed(5)}°, ${Number(incident.longitude).toFixed(5)}°` },
      ],
      note: incident.description,
      positionIsReal: false,
      options: [
        {
          label: 'Center & Zoom',
          icon: <Crosshair size={13} />,
          tone: 'ghost',
          onClick: () => flyToEntity('incident', incident.id, Number(incident.latitude), Number(incident.longitude), 14),
        },
        {
          label: 'Copy Coords',
          icon: <Copy size={13} />,
          tone: 'ghost',
          onClick: () => handleCopyCoords(incident.latitude, incident.longitude, `Incident ${incident.id}`),
        },
        {
          label: 'Emergency Console',
          icon: <AlertTriangle size={13} />,
          tone: 'alert',
          onClick: () => goTo('emergency'),
        },
        {
          label: 'Check Weather',
          icon: <Wind size={13} />,
          tone: 'ghost',
          onClick: () => goTo('weather'),
        },
      ],
    }
  }, [selected, locations, personnel, emergencies, getPerson, getLocation, getExpedition, goTo, userLocation, customPoint, personPositions])

  /* ---------- NUMBERS FOR THE SUMMARY STRIP ---------- */
  const peopleAtEmergency = people.filter((p) => p.status === 'EMERGENCY').length

  /* Personnel count per site, used by the deployment list. */
  const deployment = sites
    .map((site) => ({
      site,
      count: personnel.filter((p) => p.location_id === site.id).length,
      emergency: personnel.filter((p) => p.location_id === site.id && p.status === 'EMERGENCY')
        .length,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)

  const toggleLayer = (key) => setShow((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-4">
      {/* ================= SUMMARY STRIP ================= */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Sites plotted', value: sites.length },
          { label: 'Personnel plotted', value: people.length },
          { label: 'Open incidents', value: openIncidents.length, tone: openIncidents.length ? 'alert' : undefined },
          { label: 'People in emergency', value: peopleAtEmergency, tone: peopleAtEmergency ? 'alert' : undefined },
        ].map((item) => (
          <div key={item.label} className="card-tight">
            <div className="eyebrow">{item.label}</div>
            <div className={`stat-value mt-1 ${item.tone ? `stat-value--${item.tone}` : ''}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* If the store ever fails to load, say so — and still show the map. */}
      {error && (
        <StateBlock
          kind="error"
          title="Some records could not be loaded"
          message={String(error)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs flex items-center justify-between shadow-md transition-all ${
            toast.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-low hover:text-hi text-xs ml-3 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ============================================================
          GPS STATUS & ACTIVE OPERATIONS BAR
          ============================================================ */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-card)] p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left side: GPS Status indicator */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="eyebrow text-[10px] text-low uppercase tracking-wider font-semibold">GPS STATUS:</span>
              {gpsStatus === 'ACTIVE / LOCATED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  ACTIVE / LOCATED
                </span>
              ) : gpsStatus === 'LOCATING' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                  <RefreshCw size={11} className="animate-spin" />
                  ACQUIRING POSITION...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--surface-raised)] text-low border border-[var(--line)]">
                  <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600"></span>
                  OFFLINE
                </span>
              )}
            </div>

            {userLocation && (
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-mid border-l border-[var(--line-soft)] pl-3">
                <span className="text-hi font-medium">
                  {userLocation.latitude.toFixed(4)}°, {userLocation.longitude.toFixed(4)}°
                </span>
                <span className="text-[11px] text-low">(±{userLocation.accuracy}m)</span>
              </div>
            )}
          </div>

          {/* Right side: Locate Me button & quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-locate-me"
              disabled={locating}
              onClick={handleLocateMe}
              className="btn btn--primary btn--sm flex items-center gap-1.5 shadow-sm active:scale-95 transition"
              title="Acquire current workstation GPS coordinates"
            >
              <Navigation size={13} className={locating ? 'animate-spin' : ''} />
              <span>{locating ? 'Locating...' : 'Locate Me'}</span>
            </button>

            {userLocation && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const map = mapRef.current
                    if (map) {
                      map.flyTo([userLocation.latitude, userLocation.longitude], 14, { duration: 1.5 })
                      const marker = markersMapRef.current?.get('current_location-active_workstation')
                      if (marker) marker.openPopup()
                    }
                  }}
                  className="btn btn--ghost btn--sm flex items-center gap-1 text-xs"
                  title="Focus camera on current workstation"
                >
                  <Crosshair size={13} />
                  <span>Re-center</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="btn btn--ghost btn--sm text-xs text-low hover:text-hi"
                  title="Clear current location marker"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Selection Dropdowns Bar (Select personnel & Expeditions / Sites) */}
        <div className="mt-3 pt-3 border-t border-[var(--line-soft)] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Personnel Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="select-personnel" className="text-xs font-medium text-low shrink-0 flex items-center gap-1">
              <Users size={13} className="text-mid" />
              <span>Select personnel:</span>
            </label>
            <select
              id="select-personnel"
              value={selected?.kind === 'person' ? selected.id : ''}
              onChange={(e) => {
                const personId = e.target.value
                if (!personId) return
                const person = people.find((p) => p.id === personId)
                if (!person) return
                const pos = personPositions.get(person.id) || [Number(person.latitude), Number(person.longitude)]
                flyToEntity('person', person.id, pos[0], pos[1], 14)
              }}
              className="input text-xs py-1.5 flex-1 min-w-0"
            >
              <option value="">-- Choose Operative --</option>
              {people.map((p) => {
                const loc = getLocation(p.location_id)
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role} · {loc?.name || 'In Transit'} · {p.status})
                  </option>
                )
              })}
            </select>
          </div>

          {/* Site / Station Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="select-site" className="text-xs font-medium text-low shrink-0 flex items-center gap-1">
              <MapPin size={13} className="text-mid" />
              <span>Select site:</span>
            </label>
            <select
              id="select-site"
              value={selected?.kind === 'site' ? selected.id : ''}
              onChange={(e) => {
                const siteId = e.target.value
                if (!siteId) return
                const site = sites.find((s) => s.id === siteId)
                if (!site) return
                flyToEntity('site', site.id, Number(site.latitude), Number(site.longitude), 11)
              }}
              className="input text-xs py-1.5 flex-1 min-w-0"
            >
              <option value="">-- Choose Station / Camp / Vessel --</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({statusLabel(LOCATION_TYPE, s.type)} · {s.region})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ================= MAP + DETAIL ================= */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          eyebrow="Situation"
          title="Live Operations Chart"
          subtitle={
            viewMode === '3D'
              ? '3D Realistic Globe · Photorealistic spherical Earth with bathymetry, Antarctic ice sheet & orbital rotation'
              : '2D Tactical Map · Vivid satellite, topographic & ocean bathymetric layers with 3D horizon tilt'
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMapMinimized((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all ${
                  mapMinimized
                    ? 'border-[var(--ice)]/50 bg-[var(--ice)]/10 text-[var(--ice)]'
                    : 'border-[var(--line)] bg-[var(--surface-sunken)] text-[var(--ink-mid)] hover:text-[var(--ink-hi)]'
                }`}
                title={mapMinimized ? 'Click to expand map height' : 'Click to minimise map height'}
              >
                {mapMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                <span>{mapMinimized ? 'Minimised' : 'Expanded'}</span>
              </button>
              <div className="flex items-center rounded-lg border border-[var(--line)] bg-[var(--surface-sunken)] p-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode('3D')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    viewMode === '3D'
                      ? 'bg-[var(--surface-raised)] text-[var(--ink-hi)] shadow-sm'
                      : 'text-[var(--ink-mid)] hover:text-[var(--ink-hi)]'
                  }`}
                  title="Switch to 3D Rotating Realistic Globe"
                >
                  <Globe size={13} className={viewMode === '3D' ? 'text-[var(--ice)]' : ''} />
                  <span>3D Globe</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('2D')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    viewMode === '2D'
                      ? 'bg-[var(--surface-raised)] text-[var(--ink-hi)] shadow-sm'
                      : 'text-[var(--ink-mid)] hover:text-[var(--ink-hi)]'
                  }`}
                  title="Switch to 2D Tactical Basemaps"
                >
                  <MapIcon size={13} className={viewMode === '2D' ? 'text-[var(--ice)]' : ''} />
                  <span>2D Map</span>
                </button>
              </div>
              <SourceBadge status="OFFICIAL REFERENCE" size="sm" />
            </div>
          }
        >
          {/* Basemap & 3D Tilt Toolbar (Visible when in 2D mode) */}
          {viewMode === '2D' && (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)]/60 px-2.5 py-1.5">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-low">
                  Basemap:
                </span>
                {Object.values(MAP_STYLES).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveMapStyle(s.id)}
                    className={`btn btn--sm py-0.5 px-2 text-xs transition-all ${
                      activeMapStyle === s.id
                        ? 'border-[var(--accent)] bg-[var(--surface-raised)] text-[var(--ink-hi)] font-semibold shadow-sm'
                        : 'btn--ghost'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setInspectMode((prev) => !prev)}
                  className={`btn btn--sm py-0.5 px-2 text-xs transition-all ${
                    inspectMode
                      ? 'border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--amber)] font-semibold'
                      : 'btn--ghost'
                  }`}
                  title="Toggle point inspection mode: click anywhere on map to inspect coordinate and territory"
                >
                  <Crosshair size={12} className={inspectMode ? 'text-[var(--amber)] animate-spin' : ''} />
                  <span>{inspectMode ? 'Survey: ON' : 'Survey: OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPerspectiveTilt((prev) => !prev)}
                  className={`btn btn--sm py-0.5 px-2 text-xs transition-all ${
                    isPerspectiveTilt
                      ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] font-semibold'
                      : 'btn--ghost'
                  }`}
                  title="Tilt map in 3D perspective so target area expands and horizon recedes"
                >
                  <Sparkles size={12} className={isPerspectiveTilt ? 'text-[var(--amber)]' : ''} />
                  <span>{isPerspectiveTilt ? '3D Tilt: ON' : '3D Tilt: OFF'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Expedition quick-filter bar */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2">
            <span className="mr-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-low">
              <Users size={12} /> Expedition:
            </span>
            <button
              type="button"
              className={`btn btn--sm py-0.5 px-2 text-[11.5px] ${selectedExpedition === 'ALL' ? '' : 'btn--ghost'}`}
              onClick={() => setSelectedExpedition('ALL')}
            >
              All Expeditions ({personnel.filter(hasCoords).length})
            </button>
            {expeditions.map((exp) => {
              const expCrew = personnel.filter((p) => p.expedition_id === exp.id && hasCoords(p))
              const hasAlert =
                emergencies.some(
                  (e) =>
                    e.status !== 'RESOLVED' &&
                    (e.expedition_id === exp.id ||
                      personnel.find((p) => p.id === e.personnel_id)?.expedition_id === exp.id)
                ) || expCrew.some((p) => p.status === 'EMERGENCY')

              return (
                <button
                  key={exp.id}
                  type="button"
                  className={`btn btn--sm py-0.5 px-2 text-[11.5px] relative ${selectedExpedition === exp.id ? '' : 'btn--ghost'}`}
                  onClick={() => setSelectedExpedition(exp.id)}
                  title={`${exp.id}: ${exp.name}`}
                >
                  {exp.id} ({expCrew.length})
                  {hasAlert && (
                    <span className="ml-1 inline-block h-2 w-2 rounded-full bg-[var(--red)] animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Theatre and Layer switches (Unified compact toolbar) */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-low">
                <Compass size={12} /> Theatre:
              </span>
              {REGIONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  className={`btn btn--sm py-0.5 px-2 text-[11.5px] ${region === r.key ? '' : 'btn--ghost'}`}
                  onClick={() => setRegion(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
              <span className="flex items-center gap-1 text-[11px] text-low">
                <Layers size={12} /> Layers:
              </span>
              {[
                { key: 'sites', label: `Sites (${sites.length})` },
                { key: 'people', label: `Personnel (${people.length})` },
                { key: 'incidents', label: `Incidents (${openIncidents.length})` },
                { key: 'routes', label: `Corridors (${OPERATIONAL_ROUTES.length})` },
              ].map((layer) => (
                <label
                  key={layer.key}
                  className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-mid hover:text-hi"
                >
                  <input
                    type="checkbox"
                    checked={show[layer.key]}
                    onChange={() => toggleLayer(layer.key)}
                    className="accent-[var(--ice)]"
                  />
                  {layer.label}
                </label>
              ))}
            </div>
          </div>

          {/* GPS Trail & Device Stream Control */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn--ghost btn--sm flex items-center gap-1 text-xs"
                onClick={() => setShowTrail((value) => !value)}
              >
                <Route size={13} />
                <span>{showTrail ? 'Hide GPS trail' : 'Show GPS trail'}</span>
              </button>
              {selected?.kind === 'person' && trailError && (
                <span className="text-[11px] text-low">{trailError}</span>
              )}
            </div>

            {/* Optional personnel server tracking */}
            <div className="flex items-center gap-2 text-[11px] text-mid">
              <span>Sync person GPS:</span>
              <select
                value={trackingPersonnelId}
                onChange={(e) => setTrackingPersonnelId(e.target.value)}
                disabled={tracking}
                className="rounded border border-[var(--line)] bg-transparent px-2 py-1 text-[11px]"
              >
                <option value="">Choose person</option>
                {personnel.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`btn btn--sm text-[11px] py-1 px-2 ${tracking ? 'btn--alert' : 'btn--ghost'}`}
                disabled={!tracking && !trackingPersonnelId}
                title={!tracking && !trackingPersonnelId ? 'Select an operative first' : undefined}
                onClick={() => {
                  if (tracking) {
                    stop()
                  } else {
                    if (!databaseConfigured) setDeviceError('Live GPS requires Supabase configuration.')
                    start()
                  }
                }}
              >
                <Radio size={12} /> {tracking ? 'Stop Sync' : 'Sync'}
              </button>
            </div>
          </div>

          {/* THE MAP SHELL CONTAINER: 3D Spherical Globe vs 2D Tactical Map */}
          <div className="relative">
            {viewMode === '3D' && (
              <GlobeView
                locations={sites}
                people={people}
                openIncidents={openIncidents}
                userLocation={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null}
                customPoint={customPoint}
                selected={selected}
                onSelectEntity={(kind, id) => setSelected({ kind, id })}
                onSelectCustomPoint={handleSelectCustomPoint}
                onClearCustomPoint={() => {
                  setCustomPoint(null)
                  if (selected?.kind === 'custom_point') setSelected(null)
                }}
                getTerritoryInfo={getTerritoryInfo}
                formatCoords={formatCoords}
                minimized={mapMinimized}
              />
            )}

            <div
              style={{ display: viewMode === '2D' ? 'block' : 'none' }}
              className={`map-shell relative ${
                mapMinimized ? 'h-[270px] sm:h-[300px] lg:h-[340px]' : 'h-[480px] lg:h-[620px]'
              } ${isPerspectiveTilt ? 'map-shell--tilted' : ''} ${
                inspectMode ? 'cursor-crosshair' : ''
              } transition-[height] duration-200`}
            >
              {/* SEARCH COUNTRY BOX (Top Right, matching reference photo) */}
              <div className="absolute top-3 right-3 z-[1000] w-56 sm:w-64">
                <div className="relative flex items-center rounded-md border border-[var(--line)] bg-[var(--surface-card)]/95 shadow-md backdrop-blur-md">
                  <input
                    type="text"
                    value={searchCountryQuery}
                    onChange={(e) => {
                      setSearchCountryQuery(e.target.value)
                      setShowCountrySuggestions(true)
                    }}
                    onFocus={() => setShowCountrySuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchSubmit()
                      }
                    }}
                    placeholder="Search country"
                    className="w-full bg-transparent px-3 py-1.5 pr-8 text-xs text-[var(--ink-hi)] placeholder:text-[var(--ink-low)] focus:outline-none"
                  />
                  {searchCountryQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchCountryQuery('')
                        setShowCountrySuggestions(false)
                      }}
                      className="absolute right-2 text-low hover:text-hi p-0.5"
                    >
                      <X size={13} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="absolute right-2.5 text-mid hover:text-hi cursor-pointer"
                      title="Search country"
                    >
                      <Search size={14} />
                    </button>
                  )}
                </div>

                {/* Auto-suggest dropdown */}
                {showCountrySuggestions && countrySuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--surface-card)]/98 shadow-xl py-1 z-[1001]">
                    {countrySuggestions.map((country) => (
                      <button
                        key={country.name}
                        type="button"
                        onClick={() => handleSelectCountry(country)}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--surface-raised)] flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{country.flag || '📍'}</span>
                          <span className="font-medium text-hi truncate">{country.name}</span>
                          <span className="text-[10px] text-low shrink-0">({country.continent})</span>
                        </div>
                        {country.polarNote && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--ice)]/15 text-[var(--ice)] shrink-0 font-medium ml-1 truncate max-w-[110px]">
                            {country.polarNote}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* TACTICAL 8-DIRECTION PAN NAVIGATOR (Top Left, accessible HUD) */}
              <div className="absolute top-20 left-3 z-[1000] hidden sm:flex flex-col items-center bg-[var(--surface-card)]/92 backdrop-blur-md p-1.5 rounded-lg border border-[var(--line)] shadow-lg select-none">
                <div className="text-[9px] font-bold tracking-wider text-[var(--ink-low)] mb-1 uppercase">Pan / Nav</div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => mapRef.current?.panBy([-140, -140], { animate: true, duration: 0.2 })}
                    title="Pan Up-Left (North-West)"
                    className="h-6 w-6 rounded flex items-center justify-center text-[10px] text-mid hover:text-hi hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--line)] cursor-pointer"
                  >
                    ↖
                  </button>
                  <button
                    type="button"
                    onClick={() => mapRef.current?.panBy([0, -180], { animate: true, duration: 0.2 })}
                    title="Pan Up (North)"
                    className="h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold text-mid hover:text-hi hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--line)] cursor-pointer"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => mapRef.current?.panBy([140, -140], { animate: true, duration: 0.2 })}
                    title="Pan Up-Right (North-East)"
                    className="h-6 w-6 rounded flex items-center justify-center text-[10px] text-mid hover:text-hi hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--line)] cursor-pointer"
                  >
                    ↗
                  </button>
                  <button
                    type="button"
                    onClick={() => mapRef.current?.panBy([-180, 0], { animate: true, duration: 0.2 })}
                    title="Pan Left (West)"
                    className="h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold text-mid hover:text-hi hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--line)] cursor-pointer"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => mapRef.current?.flyTo([20, 10], 2, { duration: 1.0 })}
                    title="Recenter World View"
                    className="h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold text-[var(--ice)] hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--line)] cursor-pointer"
                  >
                    ⌖
                  </button>
                  <button
                    type="button"
                    onClick={() => mapRef.current?.panBy([180, 0], { animate: true, duration: 0.2 })}
                    title="Pan Right (East)"
                    className="h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold text-mid hover:text-hi hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--line)] cursor-pointer"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => mapRef.current?.panBy([-140, 140], { animate: true, duration: 0.2 })}
                    title="Pan Down-Left (South-West)"
                    className="h-6 w-6 rounded flex items-center justify-center text-[10px] text-mid hover:text-hi hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--line)] cursor-pointer"
                  >
                    ↙
                  </button>
                  <button
                    type="button"
                    onClick={() => mapRef.current?.panBy([0, 180], { animate: true, duration: 0.2 })}
                    title="Pan Down (South)"
                    className="h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold text-mid hover:text-hi hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--line)] cursor-pointer"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => mapRef.current?.panBy([140, 140], { animate: true, duration: 0.2 })}
                    title="Pan Down-Right (South-East)"
                    className="h-6 w-6 rounded flex items-center justify-center text-[10px] text-mid hover:text-hi hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--line)] cursor-pointer"
                  >
                    ↘
                  </button>
                </div>
              </div>

              {/* SURVEY INSPECT MODE BANNER */}
              {inspectMode && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 rounded-full border border-[var(--amber)] bg-[var(--surface-card)]/95 px-3.5 py-1.5 text-xs text-[var(--amber)] shadow-xl backdrop-blur-md">
                  <Crosshair size={13} className="animate-spin" />
                  <span className="font-semibold">Survey Mode Active:</span>
                  <span className="text-[var(--ink-hi)]">Click any map point to drop pin & inspect geodetics</span>
                  <button
                    type="button"
                    onClick={() => setInspectMode(false)}
                    className="ml-2 underline text-xs hover:text-white"
                  >
                    Done
                  </button>
                </div>
              )}

              <div ref={containerRef} className="h-full w-full" />

              {loading && (
                <div className="absolute inset-0 z-[500] grid place-items-center bg-[var(--surface-base)]/80 backdrop-blur-sm">
                  <StateBlock kind="loading" title="Plotting assets…" message="Reading the roster." />
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* ---------- RIGHT COLUMN: detail + legend ---------- */}
        <div className="space-y-4">
          <Panel
            eyebrow={detail ? detail.kind : 'Selection'}
            title={detail ? detail.title : 'Nothing selected'}
            subtitle={detail ? detail.coords : 'Click a marker or any point on the chart'}
            action={detail?.badge}
          >
            {!detail ? (
              <div className="state-block">
                <Crosshair size={20} strokeWidth={1.75} className="mx-auto mb-2 text-[var(--ink-low)]" />
                <strong>No marker or point selected</strong>
                <span>
                  Click any marker (site, person, incident) or click anywhere on the map to inspect country location, nearest station, and action options.
                </span>
              </div>
            ) : (
              <>
                <dl className="mb-3">
                  {detail.rows.map((row) => (
                    <div key={row.label} className="kv">
                      <dt>{row.label}</dt>
                      <dd className="truncate" title={typeof row.value === 'string' ? row.value : undefined}>{row.value}</dd>
                    </div>
                  ))}
                </dl>

                {detail.note && (
                  <p className="mb-3 text-[12px] leading-relaxed text-mid">{detail.note}</p>
                )}

                <p className="mb-3 text-[11px] leading-relaxed text-low">
                  {detail.kind === 'Personnel'
                    ? detail.gpsState === 'LIVE'
                      ? 'LIVE GPS · Live device GPS.'
                      : detail.gpsState === 'STALE'
                        ? `GPS stale — last update ${timeAgo(getPerson(selected.id)?.last_updated)}.`
                        : 'Standby coordinates — satellite telemetry active.'
                    : detail.kind === 'Survey Point'
                      ? 'Geodetic survey fix derived from direct map point interaction.'
                      : detail.positionIsReal
                        ? 'Position: real published coordinates for this site.'
                        : 'Position: live station / field telemetry.'}
                </p>

                {/* Primary Action Button (if any) */}
                {detail.action && <div className="mb-3">{detail.action}</div>}

                {/* More Options / Quick Action Toolbar */}
                {detail.options && detail.options.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2">
                    <div className="text-[11px] font-semibold text-low uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers size={12} /> More Options & Actions
                      </span>
                      <span className="text-[10px] text-mid font-mono font-normal">
                        {detail.options.length} actions
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.options.map((opt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={opt.onClick}
                          className={`btn btn--sm flex items-center gap-1.5 text-xs ${
                            opt.tone === 'primary'
                              ? 'btn--primary'
                              : opt.tone === 'alert'
                              ? 'btn--alert'
                              : 'btn--ghost'
                          }`}
                          title={opt.title || opt.label}
                        >
                          {opt.icon}
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Panel>

          {/* ---------- LEGEND ---------- */}
          <Panel eyebrow="Key" title="Legend" tight>
            <div className="mb-3">
              <div className="mb-1.5 text-[11px] text-low">Sites — square</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {Object.entries(LOCATION_TYPE).map(([key, meta]) => (
                  <span key={key} className="flex items-center gap-1.5 text-[11.5px] text-mid">
                    <i
                      className="legend-swatch"
                      style={{ background: SITE_COLOUR[key], borderRadius: 2 }}
                    />
                    {meta.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 text-[11px] text-low">Personnel — dot</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {Object.entries(PERSONNEL_STATUS).map(([key, meta]) => (
                  <span key={key} className="flex items-center gap-1.5 text-[11.5px] text-mid">
                    <i
                      className="legend-swatch"
                      style={{ background: PERSON_COLOUR[key], borderRadius: '50%' }}
                    />
                    {meta.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 text-[11px] text-low">Incidents — pulsing ring</div>
              <span className="flex items-center gap-1.5 text-[11.5px] text-mid">
                <i
                  className="legend-swatch"
                  style={{
                    background: 'rgba(255,90,90,0.28)',
                    borderColor: 'var(--red)',
                    borderRadius: '50%',
                  }}
                />
                Open emergency
              </span>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] text-low">Corridors — dashed line</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-mid">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-[#0ea5e9]" />
                  Air & Sea Staging
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-[#f59e0b]" />
                  Overland Traverse
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* ================= LISTS UNDER THE MAP ================= */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          eyebrow="Deployment"
          title={deploymentView === 'EXPEDITIONS' ? 'Personnel by Expedition' : 'Personnel by Site'}
          subtitle={
            deploymentView === 'EXPEDITIONS'
              ? 'Separate force deployment sections · click any person or expedition to centre chart'
              : 'Click a site to centre the chart on it'
          }
          action={
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={`btn btn--sm ${deploymentView === 'EXPEDITIONS' ? '' : 'btn--ghost'}`}
                onClick={() => setDeploymentView('EXPEDITIONS')}
              >
                By Expedition
              </button>
              <button
                type="button"
                className={`btn btn--sm ${deploymentView === 'SITES' ? '' : 'btn--ghost'}`}
                onClick={() => setDeploymentView('SITES')}
              >
                By Site
              </button>
            </div>
          }
        >
          {deploymentView === 'EXPEDITIONS' ? (
            <div className="space-y-4">
              {expeditions.map((exp) => {
                const expCrew = personnel.filter((p) => p.expedition_id === exp.id && hasCoords(p))
                if (expCrew.length === 0) return null

                const activeCount = expCrew.filter((p) => p.status === 'ACTIVE').length
                const transitCount = expCrew.filter((p) => p.status === 'IN_TRANSIT').length
                const emergencyCount = expCrew.filter((p) => p.status === 'EMERGENCY').length

                return (
                  <div
                    key={exp.id}
                    className={`rounded border p-3 ${
                      selectedExpedition === exp.id
                        ? 'border-[var(--ice)] bg-[var(--surface-base)]'
                        : 'border-[var(--border-subtle)] bg-[var(--surface-sunken)]'
                    }`}
                  >
                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="mono font-semibold text-[12px] text-hi">{exp.id}</span>
                          <span className="text-[12.5px] font-medium text-hi">{exp.name}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-low">
                          Destination: <span className="text-mid">{exp.destination}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-mid">
                          {activeCount} active · {transitCount} transit
                        </span>
                        {emergencyCount > 0 && (
                          <Badge tone="critical" label={`${emergencyCount} emergency`} />
                        )}
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm ml-1 text-[11px]"
                          onClick={() => {
                            setSelectedExpedition(exp.id)
                          }}
                        >
                          Focus Expedition
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {expCrew.map((person) => {
                        const place = getLocation(person.location_id)
                        return (
                          <button
                            key={person.id}
                            type="button"
                            className={`card-interactive flex items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-[11.5px] ${
                              selected?.kind === 'person' && selected.id === person.id
                                ? 'bg-[var(--surface-subtle)] ring-1 ring-[var(--ice)]'
                                : ''
                            }`}
                            onClick={() =>
                              focusOn(
                                'person',
                                person.id,
                                Number(person.latitude),
                                Number(person.longitude)
                              )
                            }
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                                  style={{
                                    background:
                                      PERSON_COLOUR[person.status] || 'var(--ink-low)',
                                  }}
                                />
                                <span className="truncate font-medium text-hi">{person.name}</span>
                              </div>
                              <div className="truncate text-[10.5px] text-low">
                                {person.role} · {place ? place.name : 'Deployed'}
                              </div>
                            </div>
                            <Badge map={PERSONNEL_STATUS} value={person.status} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : deployment.length === 0 ? (
            <StateBlock kind="empty" title="Nobody is deployed" message="The roster is empty." />
          ) : (
            <ul className="space-y-1">
              {deployment.map(({ site, count, emergency }) => (
                <li key={site.id}>
                  <button
                    type="button"
                    className="card-interactive flex w-full items-center gap-3 rounded-[3px] px-2 py-2 text-left"
                    onClick={() =>
                      focusOn('site', site.id, Number(site.latitude), Number(site.longitude))
                    }
                  >
                    <i
                      className="legend-swatch"
                      style={{ background: SITE_COLOUR[site.type], borderRadius: 2 }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-hi">{site.name}</span>
                      <span className="block truncate text-[11px] text-low">{site.region}</span>
                    </span>
                    {emergency > 0 && (
                      <Badge tone="critical" label={`${emergency} emergency`} />
                    )}
                    <span className="mono shrink-0 text-[12px] text-mid">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          eyebrow="Incidents"
          title="Open Incidents on the Chart"
          subtitle={
            openIncidents.length
              ? 'Click one to centre the chart on it'
              : 'Nothing open — the chart is clear'
          }
          action={
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => goTo('emergency')}>
              <Radio size={13} /> Emergency console
            </button>
          }
        >
          {openIncidents.length === 0 ? (
            <StateBlock
              kind="empty"
              title="No open incidents"
              message="Nothing is currently being responded to."
            />
          ) : (
            <ul className="space-y-1">
              {openIncidents.map((incident) => (
                <li key={incident.id}>
                  <button
                    type="button"
                    className="card-interactive flex w-full items-start gap-3 rounded-[3px] px-2 py-2 text-left"
                    onClick={() =>
                      focusOn(
                        'incident',
                        incident.id,
                        Number(incident.latitude),
                        Number(incident.longitude)
                      )
                    }
                  >
                    <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--red)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-hi">
                        {statusLabel(EMERGENCY_TYPE, incident.type)} — {incident.location}
                      </span>
                      <span className="mono block truncate text-[11px] text-low">
                        {incident.id} · {timeAgo(incident.reported_at)}
                      </span>
                    </span>
                    <Badge map={EMERGENCY_STATUS} value={incident.status} dot />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ================= GPS DATA NOTICE ================= */}
      <div className="alert-strip alert-strip--warn">
        <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--amber)]" />
        <div className="text-[12px] leading-relaxed text-mid">
          <strong className="text-hi">GPS data states are explicit.</strong> LIVE GPS comes from a
          browser device location that was explicitly started and saved to Supabase. STALE GPS is
          real device data older than 5 minutes. Personnel without device GPS remain DEMO DATA;
          site coordinates are published reference positions. This console does not connect to an
          NCPOR, satellite or external rescue tracking feed.
        </div>
      </div>
    </div>
  )
}
