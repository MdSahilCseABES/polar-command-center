import { useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  Info,
  Layers,
  MapPin,
  ShieldCheck,
  Thermometer,
} from 'lucide-react'
import Panel from '../components/Panel'
import Badge from '../components/Badge'
import SourceBadge from '../components/SourceBadge'
import { OFFICIAL_STATIONS } from '../data/stationData'

const SOURCES_DATA = [
  {
    category: 'indian',
    id: 'ncpor-met',
    title: 'NCPOR Meteorological Data Portal',
    organization: 'National Centre for Polar and Ocean Research (MoES, Govt. of India)',
    url: 'https://www.data.ncpor.res.in/',
    dataType: 'Direct In-Situ Station Meteorological Observations',
    status: 'OFFICIAL REFERENCE',
    coverage: 'Maitri Station & Bharati Station',
    usage: 'Ground-truth observational baseline for temperature, pressure, wind velocity, and relative humidity for Indian Antarctic bases.',
    parameters: ['Surface Temperature', 'Atmospheric Pressure', 'Wind Speed & Direction', 'Relative Humidity', 'Solar Radiation'],
    frequency: 'Hourly / Synoptic Interval Observations',
    traceability: 'MoES Data Repository Identifier: MoES/NCPOR/MET-ANT',
  },
  {
    category: 'indian',
    id: 'ncpor-pdc',
    title: 'National Polar Data Centre (NPDC)',
    organization: 'NCPOR / Ministry of Earth Sciences',
    url: 'https://npdc.ncpor.res.in/pdc/',
    dataType: 'National Polar Geospatial & Scientific Archives',
    status: 'OFFICIAL REFERENCE',
    coverage: 'East Antarctica (Queen Maud Land, Larsemann Hills), Arctic (Ny-Ålesund), Southern Ocean',
    usage: 'Curated scientific records, physical oceanography, atmospheric chemistry, and station geospatial reference coordinates.',
    parameters: ['Station Geospatial Coordinates', 'Scientific Expedition Metadata', 'Long-term Climate Records'],
    frequency: 'Post-expedition peer-reviewed scientific releases',
    traceability: 'NPDC Portal Reference Catalog (PDC-IND-ANT)',
  },
  {
    category: 'indian',
    id: 'ncpor-aws',
    title: 'NCPOR Automatic Weather Station (AWS) Archives',
    organization: 'NCPOR & Indian Institute of Geomagnetism (IIG)',
    url: 'https://npdc.ncpor.res.in/pdc/Aws/iig/Awsdata-iig.jsp',
    dataType: 'Automated Weather Telemetry & Historical Series',
    status: 'NCPOR OBSERVATION',
    coverage: 'Maitri (WMO 89514) & Bharati (WMO 89512)',
    usage: 'Empirical benchmark series (2012–2024) validating mid-winter extreme operational thresholds and blizzard patterns.',
    parameters: ['Air Temperature (°C)', 'Wind Speed (kt / m/s)', 'Station Pressure (hPa)', 'RH (%)', 'Wind Direction (deg)'],
    frequency: '10-minute logging, synoptic transmission',
    traceability: 'AWS-MTR-IIG / AWS-BHR-NCPOR records',
  },
  {
    category: 'indian',
    id: 'ncpor-stations',
    title: 'NCPOR Antarctic Research Stations Registry',
    organization: 'NCPOR / MoES',
    url: 'https://npdc.ncpor.res.in/npdc/research-stations.action',
    dataType: 'Permanent Base Infrastructure & Location Coordinates',
    status: 'OFFICIAL REFERENCE',
    coverage: 'Dakshin Gangotri, Maitri, Bharati, Himadri',
    usage: 'Authoritative WGS-84 station coordinates, elevation MSL, winter/summer personnel capacity, and communications infrastructure.',
    parameters: ['WGS84 Coordinates', 'Elevation (m MSL)', 'Station Architecture', 'Winter/Summer Complement'],
    frequency: 'Station Operational Factsheet (Revised annually)',
    traceability: 'NCPOR Station Directory Bulletin',
  },
  {
    category: 'indian',
    id: 'ncpor-expeditions',
    title: 'Indian Antarctic Expeditions (ISEA) Directory',
    organization: 'NCPOR / MoES',
    url: 'https://ncps.ncpor.res.in/expedition/india_antarctica.php',
    dataType: 'National Scientific Expedition History & Voyage Charters',
    status: 'OFFICIAL REFERENCE',
    coverage: '1st ISEA (1981) to 44th ISEA (2024–2025)',
    usage: 'Expedition nomenclature, voyage timelines, scientific objectives, and logistics charter corridors.',
    parameters: ['Expedition Number', 'Departure/Return Dates', 'Vessel Chartered (e.g., MV Vasiliy Golovnin)', 'Leader & Winter Team Count'],
    frequency: 'Annual expedition commissioning and decommissioning cycles',
    traceability: 'ISEA Official Gazetted Reports',
  },
  {
    category: 'indian',
    id: 'ncpor-advisory',
    title: 'NCPOR Operational & Medical Advisory Guidelines',
    organization: 'NCPOR / Armed Forces Medical Services (AFMS / AFMC Pune)',
    url: 'https://ncaor.gov.in/pages/display/352-advisory',
    dataType: 'Operational Protocol, Medical Readiness & Logistics Governance',
    status: 'OFFICIAL REFERENCE',
    coverage: 'All personnel deploying to Maitri, Bharati, and Larsemann Hills',
    usage: 'Medical fitness criteria, survival gear protocols, winter-over psychological clearances, and fuel/ration contingency reserves.',
    parameters: ['Cold-Weather Clothing Standards', 'High-Calorie Dietary Requirements (3,800 kcal/day)', 'Emergency Evacuation Guidelines'],
    frequency: 'Updated per pre-expedition briefing cycle',
    traceability: 'MoES Polar Operational Directive Series',
  },
  {
    category: 'weather',
    id: 'open-meteo',
    title: 'Open-Meteo Historical Weather Archive API',
    organization: 'Open-Meteo GmbH & ECMWF Copernicus Programme',
    url: 'https://open-meteo.com/en/docs/historical-weather-api',
    dataType: 'Numerical Weather Prediction & Reanalysis (ERA5-Land)',
    status: 'HISTORICAL REANALYSIS',
    coverage: 'Global 9km grid including inland and coastal Antarctica',
    usage: 'Synthesized high-resolution hourly meteorological time-series for Maitri and Bharati where real-time continuous telemetry links are intermittent.',
    parameters: ['2m Temperature', 'Relative Humidity', 'Surface Pressure', '10m Wind Speed & Gusts', 'Weather Codes (WMO)'],
    frequency: 'Hourly resolution, updated with ERA5 reanalysis cycles',
    traceability: 'Copernicus Climate Change Service (C3S) / ECMWF ERA5-Land',
  },
  {
    category: 'weather',
    id: 'imd-polar',
    title: 'India Meteorological Department (IMD) Polar Division',
    organization: 'IMD, Ministry of Earth Sciences',
    url: 'https://mausam.imd.gov.in/',
    dataType: 'Synoptic Weather Charts & Antarctic Forecasting',
    status: 'OFFICIAL REFERENCE',
    coverage: 'Maitri Meteorological Observatory (WMO 89514)',
    usage: 'Synoptic weather codes, katabatic wind advisory thresholds, and blizzard warning protocols.',
    parameters: ['Synoptic Surface Obs', 'Blizzard Classification', 'Upper Air Radiosonde Data'],
    frequency: '6-hourly synoptic transmissions during occupied season',
    traceability: 'IMD Polar Met Technical Reports',
  },
  {
    category: 'international',
    id: 'comnap',
    title: 'Council of Managers of National Antarctic Programs (COMNAP)',
    organization: 'COMNAP Secretariat (Christchurch, NZ)',
    url: 'https://www.comnap.aq/',
    dataType: 'International Logistics, Search & Rescue, and Air Operations Protocols',
    status: 'OFFICIAL REFERENCE',
    coverage: 'All 32 National Antarctic Treaty Operating Base Nations',
    usage: 'Standardized Antarctic search and rescue (SAR) coordination procedures, DROMLAN aviation runway standards, and international mutual assistance treaties.',
    parameters: ['SAR Contact Network', 'DROMLAN Blue Ice Runway Specs (Novo Airbase)', 'Station Emergency Evacuation Zones'],
    frequency: 'Annual Operations & Logistics Manuals',
    traceability: 'COMNAP Antarctic Station Catalogue & SAR Manual',
  },
  {
    category: 'international',
    id: 'aad',
    title: 'Australian Antarctic Division (AAD) Station Operations',
    organization: 'Department of Climate Change, Energy, the Environment and Water (Australia)',
    url: 'https://www.antarctica.gov.au/antarctic-operations/stations-and-field-locations/',
    dataType: 'Operational Logistics & Field Safety Benchmarks',
    status: 'OFFICIAL REFERENCE',
    coverage: 'Casey, Davis, Mawson (Prydz Bay / East Antarctica)',
    usage: 'East Antarctic neighboring base operational models, sea-ice logistics protocols, and fuel depot maintenance guidelines.',
    parameters: ['Station Fuel Burn Curves', 'Prydz Bay Sea-Ice Breakup Trends', 'Field Traverse Safety Rules'],
    frequency: 'Published Operational Field Guidelines',
    traceability: 'AAD Operational Documentation Repository',
  },
]

const METHODOLOGY_RULES = [
  {
    num: '01',
    title: 'NCPOR Geodetic Ground-Truth',
    text: 'Official NCPOR geodetic coordinates, elevations, commissioning years, and capacity benchmarks are strictly used for Maitri, Bharati, Himadri, and logistics waypoints. No coordinates or station capabilities are invented.',
  },
  {
    num: '02',
    title: 'Meteorological Integrity & Provenance',
    text: 'NCPOR in-situ AWS benchmark records are preferred for Indian Antarctic observations. When numerical modeling or global reanalysis is utilized via Open-Meteo, it is strictly labeled as "HISTORICAL REANALYSIS" or "NWP MODEL", never falsely claimed as live direct station observations.',
  },
  {
    num: '03',
    title: 'Transparent Privacy in Operational Records',
    text: 'Authoritative government personnel databases and active operational field manifests are classified for privacy and security. The platform uses realistic, AFMC-compliant operational staffing patterns and DROMLAN cargo manifests, explicitly labeled "DEMO PERSONNEL" and "SIMULATED LOGISTICS DATA" with zero deceptive claims.',
  },
  {
    num: '04',
    title: 'Standardized Incident Response Workflows',
    text: 'Emergency modules simulate COMNAP/NCPOR emergency action plans (blizzards, medical medevacs, crevasse extractions, generator failures). All test incidents are distinctly tagged as "SIMULATED INCIDENT" to demonstrate real triage capability without misrepresenting actual crises.',
  },
  {
    num: '05',
    title: 'Total System Traceability',
    text: 'Every dataset across every tab presents its data source, classification status, update frequency, and verification link via reusable provenance badges (<SourceBadge />, <DataProvenance />).',
  },
]

const FAQ_ITEMS = [
  {
    q: 'Is the weather data live from the station right now?',
    a: 'The live weather panel polls Open-Meteo numerical weather prediction models anchored to official NCPOR geodetics. The historical view accesses ECMWF ERA5-Land reanalysis archives backed by NCPOR AWS 2012–2024 benchmark records. We explicitly label this as "HISTORICAL REANALYSIS / NWP MODEL" because direct satellite telemetry from Maitri/Bharati is proprietary and subject to polar blackout.',
  },
  {
    q: 'Are the personnel shown real scientists currently at Maitri or Bharati?',
    a: 'No. Under Indian privacy governance and MoES guidelines, active winter-over personnel rosters are not published for public tracking. Our personnel records are realistic operational models tagged as "DEMO PERSONNEL" based on AFMC medical staffing and NCPOR winter-team structures.',
  },
  {
    q: 'Are the cargo and inventory manifests actual Indian Antarctic stockpiles?',
    a: 'No. Actual defense and polar stockpiles are secure logistics data. Our cargo and inventory categories (ATF Arctic Fuel, freeze-dried rations, cold-weather apparel, satellite parts) are modeled after NCPOR logistics advisories and DROMLAN flight allowances, clearly labeled as "SIMULATED LOGISTICS DATA".',
  },
  {
    q: 'How are station coordinates verified?',
    a: 'Maitri (70°45\'58" S, 11°43\'56" E, 117m) and Bharati (69°24\'29" S, 76°11\'14" E, 35m) use exact WGS-84 coordinates verified from the National Polar Data Centre (NPDC) and NCPOR research station registry.',
  },
]

export default function ResearchSources({ goTo }) {
  const [filterCategory, setFilterCategory] = useState('all')

  const filteredSources =
    filterCategory === 'all'
      ? SOURCES_DATA
      : SOURCES_DATA.filter((s) => s.category === filterCategory)

  return (
    <div className="space-y-6 pb-12">
      {/* Return to Operations Navigation Bar */}
      <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-3">
        <button
          type="button"
          onClick={() => goTo('dashboard')}
          className="btn btn--sm btn--ghost inline-flex items-center gap-1.5 text-xs text-mid hover:text-hi"
        >
          <ArrowLeft size={14} />
          <span>Return to Operations Dashboard</span>
        </button>
        <span className="text-[11px] font-mono text-mid uppercase tracking-wider">
          System Reference &amp; Provenance Console
        </span>
      </div>

      {/* Hero Banner with PDF Download */}
      <div className="rounded-xl border border-[var(--primary)]/30 bg-gradient-to-r from-[var(--surface-sunken)] via-[var(--surface)] to-[var(--surface-sunken)] p-6 shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/15 px-3 py-1 font-mono text-xs font-semibold text-[var(--primary)] border border-[var(--primary)]/30">
                <ShieldCheck size={14} /> MoES / NCPOR POLAR REFERENCE ARCHITECTURE
              </span>
              <SourceBadge status="OFFICIAL REFERENCE" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-hi)] sm:text-3xl">
              Research References & Data Sources
            </h1>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              This system is built upon verified scientific reference data from the{' '}
              <strong className="text-[var(--text-hi)]">National Centre for Polar and Ocean Research (NCPOR)</strong>,{' '}
              <strong className="text-[var(--text-hi)]">Ministry of Earth Sciences (MoES)</strong>, and international polar organizations.
              Every data point is transparently attributed, verified, and documented.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <a
              href="/Polar_Command_Center_Resource_Attribution_Directory.pdf"
              download="Polar_Command_Center_Resource_Attribution_Directory.pdf"
              className="btn btn--primary flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] transition-transform"
            >
              <Download size={16} />
              <span>Download Complete Resource PDF</span>
            </a>
            <button
              type="button"
              onClick={() => goTo('weather')}
              className="btn btn--secondary flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium"
            >
              <Thermometer size={16} />
              <span>Explore Station Weather</span>
            </button>
          </div>
        </div>
      </div>

      {/* Official Indian Stations Registry */}
      <Panel
        title="Official Indian Antarctic Stations — Coordinates & Infrastructure Baseline"
        badge="NCPOR Published"
      >
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          Official station coordinates and elevations below are sourced directly from the National Polar Data Centre (NPDC) registry.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {OFFICIAL_STATIONS.map((st) => (
            <div
              key={st.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-[var(--primary)]">{st.id}</span>
                  <SourceBadge status={st.dataStatus} />
                </div>
                <h3 className="font-semibold text-[var(--text-hi)] text-base mb-1">{st.name}</h3>
                <p className="text-xs text-[var(--text-muted)] mb-3">{st.region || st.location || 'Antarctic Station'}</p>

                <div className="space-y-1.5 font-mono text-xs text-[var(--text)] mb-3">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Coords:</span>
                    <span>{st.latitude.toFixed(4)}°, {st.longitude.toFixed(4)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Elevation:</span>
                    <span>{st.elevation} m MSL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Capacity:</span>
                    <span>
                      {typeof st.capacity === 'object' && st.capacity !== null
                        ? `${st.capacity.winter}W / ${st.capacity.summer}S crew`
                        : String(st.capacity || 'N/A')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">WMO Station:</span>
                    <span>{st.wmoCode || st.meteorologicalAvailability?.stationCode || 'Regional Base'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">{st.source}</span>
                <a
                  href={st.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
                >
                  Verify <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Filterable Source Repository */}
      <Panel
        title="Authoritative Data Sources & Repositories"
        badge={`${filteredSources.length} Verified Sources`}
      >
        <div className="mb-4 flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
          {[
            { id: 'all', label: 'All Sources' },
            { id: 'indian', label: 'NCPOR / MoES Indian Sources' },
            { id: 'weather', label: 'Atmospheric & Weather APIs' },
            { id: 'international', label: 'International Polar Bodies' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                filterCategory === tab.id
                  ? 'bg-[var(--primary)] text-black shadow'
                  : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-hi)] border border-[var(--border)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSources.map((source) => (
            <div
              key={source.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-5 flex flex-col justify-between hover:border-[var(--primary)]/50 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-[var(--text-hi)] text-base">{source.title}</h3>
                  <SourceBadge status={source.status} />
                </div>
                <p className="text-xs font-medium text-[var(--primary)] mb-2">{source.organization}</p>
                <p className="text-xs text-[var(--text)] mb-3 leading-relaxed">{source.usage}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-[var(--surface)] p-3 rounded border border-[var(--border)] mb-3">
                  <div>
                    <span className="text-[var(--text-muted)] block">Data Type:</span>
                    <span className="font-medium text-[var(--text-hi)]">{source.dataType}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Coverage:</span>
                    <span className="font-medium text-[var(--text-hi)]">{source.coverage}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Frequency:</span>
                    <span className="font-medium text-[var(--text-hi)]">{source.frequency}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Traceability ID:</span>
                    <span className="font-mono text-[10px] text-[var(--text)]">{source.traceability}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <span className="text-[11px] text-[var(--text-muted)] block mb-1">Observed Variables:</span>
                  <div className="flex flex-wrap gap-1">
                    {source.parameters.map((param) => (
                      <span
                        key={param}
                        className="rounded bg-[var(--surface-raised)] border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)]"
                      >
                        {param}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[var(--text-muted)]">Verified Reference</span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  Visit Portal <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Data Methodology & Integrity Charter */}
      <Panel title="Data Methodology & Provenance Charter" badge="Compliance & Governance">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {METHODOLOGY_RULES.map((rule) => (
            <div
              key={rule.num}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-4 flex flex-col"
            >
              <span className="font-mono text-xl font-bold text-[var(--primary)] mb-2">{rule.num}</span>
              <h4 className="font-semibold text-xs text-[var(--text-hi)] mb-2">{rule.title}</h4>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed flex-1">{rule.text}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Technical FAQ — Architecture & Verification Matrix */}
      <Panel title="Technical Architecture & Data Provenance FAQ" badge="Operational Verification">
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          Architectural specifications and transparency answers regarding real-time sensors, operational models, and telemetry feeds.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-4"
            >
              <div className="flex items-start gap-2 mb-2">
                <HelpCircle size={15} className="mt-0.5 text-[var(--primary)] shrink-0" />
                <h4 className="font-semibold text-xs text-[var(--text-hi)]">{item.q}</h4>
              </div>
              <p className="text-xs text-[var(--text-muted)] pl-5 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
