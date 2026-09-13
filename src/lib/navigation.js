/**
 * THE NAVIGATION LIST
 * ===================
 * All eight modules of the system, defined once.
 *
 * Both the sidebar (which draws the links) and App.jsx (which decides
 * which page to show, and what title to put at the top) read this list,
 * so they can never disagree with each other.
 *
 * `id`      – the internal name of the view
 * `label`   – what the sidebar shows
 * `title`   – the heading shown at the top of the page
 * `blurb`   – one line under the heading, so an operator instantly knows what
 *             the page is for
 * `icon`    – a Lucide icon component
 * `group`   – which sidebar section it sits under
 */

import {
  BookOpen,
  Bot,
  Boxes,
  CloudSnow,
  Compass,
  LayoutDashboard,
  Map,
  Package,
  Siren,
  Users,
} from 'lucide-react'

export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    title: 'Operations Dashboard',
    blurb: 'Live overview of every expedition, asset and open incident.',
    icon: LayoutDashboard,
    group: 'Operations',
  },
  {
    id: 'copilot',
    label: 'Polar AI Copilot',
    title: 'AURORA — Polar Intelligence Copilot',
    blurb: 'AI operations assistant for real-time mission support and procedures.',
    icon: Bot,
    group: 'Operations',
    hidden: true,
  },
  {
    id: 'expeditions',
    label: 'Expeditions',
    title: 'Expedition Management',
    blurb: 'Plan, track and update every polar expedition.',
    icon: Compass,
    group: 'Operations',
  },
  {
    id: 'personnel',
    label: 'Personnel',
    title: 'Personnel Tracking',
    blurb: 'Team roster, duty status and last reported position.',
    icon: Users,
    group: 'Operations',
  },
  {
    id: 'cargo',
    label: 'Cargo',
    title: 'Cargo Tracking',
    blurb: 'Consignments in transit between ports, vessels and stations.',
    icon: Package,
    group: 'Logistics',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    title: 'Inventory Management',
    blurb: 'Station stock levels with automatic low-stock detection.',
    icon: Boxes,
    group: 'Logistics',
  },
  {
    id: 'map',
    label: 'Live Map',
    title: 'Map Integration',
    blurb: 'Stations, field camps, vessels and personnel on one map.',
    icon: Map,
    group: 'Situation',
  },
  {
    id: 'weather',
    label: 'Weather',
    title: 'Weather Integration',
    blurb: 'Current conditions and forecast for each polar location.',
    icon: CloudSnow,
    group: 'Situation',
  },
  {
    id: 'emergency',
    label: 'Emergency',
    title: 'Emergency Response',
    blurb: 'Report incidents and coordinate the response.',
    icon: Siren,
    group: 'Response',
  },
  {
    id: 'sources',
    label: 'Data Sources & Provenance',
    title: 'Research References & Data Provenance',
    blurb: 'Official source attribution, NCPOR station records and meteorological datasets.',
    icon: BookOpen,
    group: 'Operations',
    hidden: true,
  },
]

/* The sidebar draws its sections in this order. */
export const NAV_GROUPS = ['Operations', 'Logistics', 'Situation', 'Response']

/** Finds one nav item by id. Falls back to the dashboard so an unknown
    view can never leave the screen blank. */
export function findNavItem(id) {
  return NAV_ITEMS.find((item) => item.id === id) || NAV_ITEMS[0]
}
