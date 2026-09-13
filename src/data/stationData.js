/**
 * NCPOR OFFICIAL RESEARCH STATIONS & OPERATIONAL NODES
 * ====================================================
 * Authoritative geodetic, structural and meteorological metadata
 * compiled directly from the National Centre for Polar and Ocean Research (NCPOR),
 * Ministry of Earth Sciences (MoES), Government of India.
 *
 * Sources:
 * - NCPOR Research Stations: https://npdc.ncpor.res.in/npdc/research-stations.action
 * - NCPOR Polar Data Centre: https://npdc.ncpor.res.in/pdc/
 * - NCPOR AWS Data: https://npdc.ncpor.res.in/pdc/Aws/iig/Awsdata-iig.jsp
 * - COMNAP Antarctic Station Catalogue: https://www.comnap.aq/
 *
 * DATA INTEGRITY CLASSIFICATION:
 * All station coordinates, elevations, commissioning years, and physical
 * infrastructure descriptions in this file are OFFICIAL REFERENCE DATA.
 */

export const OFFICIAL_STATIONS = [
  {
    id: 'LOC-MAITRI',
    name: 'Maitri Station',
    hindiName: 'मैत्री अनुसंधान केंद्र',
    latitude: -70.7661,
    longitude: 11.7322,
    coordinatesFormatted: '70°45′58″ S, 11°43′56″ E',
    elevation: 117,
    elevationFormatted: '117 m above MSL',
    country: 'India',
    region: 'Schirmacher Oasis, Queen Maud Land, East Antarctica',
    stationType: 'Permanent Year-Round Inland Station',
    commissioning: '1989 (8th Indian Scientific Expedition to Antarctica — ISEA)',
    status: 'Operational',
    capacity: {
      winter: 25,
      summer: 65,
      description: '25 core wintering crew, up to 65 summer scientists and technical specialists',
    },
    facilities: [
      'Main station building with living quarters, medical surgical room, and kitchen',
      'Containerized accommodation modules (A-type containers)',
      'Power generation plant (250 kVA Caterpillar and Cummins diesel generator sets)',
      'Closed-loop hydronic heating with anti-freeze glycol heat-exchangers',
      'Priyadarshini Lake freshwater pumping station with electrically heat-traced pipeline',
      'Aerobic biological wastewater treatment plant (WTP) with membrane bioreactor',
      'SATCOM earth station radome (C-band and Ku-band uplinks)',
      'Geomagnetic observatory container (IIG) and IMD meteorological office',
    ],
    meteorologicalAvailability: {
      provider: 'India Meteorological Department (IMD) / Indian Institute of Geomagnetism (IIG)',
      stationCode: '89514',
      parameters: ['Air Temperature', 'Surface Pressure', 'Wind Speed', 'Wind Direction', 'Relative Humidity', 'Radiosonde Soundings', 'Solar Radiation'],
      archiveStatus: 'Continuous AWS recordings since 1989',
      sourceUrl: 'https://npdc.ncpor.res.in/pdc/Aws/iig/Awsdata-iig.jsp',
    },
    source: 'National Centre for Polar and Ocean Research (NCPOR), MoES',
    sourceUrl: 'https://npdc.ncpor.res.in/npdc/research-stations.action',
    dataStatus: 'OFFICIAL REFERENCE',
    notes: 'Replaced Dakshin Gangotri (India\'s first station, buried in ice in 1990). Serves as the inland command hub for Queen Maud Land scientific traverses.',
  },
  {
    id: 'LOC-BHARATI',
    name: 'Bharati Station',
    hindiName: 'भारती अनुसंधान केंद्र',
    latitude: -69.4078,
    longitude: 76.1872,
    coordinatesFormatted: '69°24′28″ S, 76°11′14″ E',
    elevation: 35,
    elevationFormatted: '35 m above MSL',
    country: 'India',
    region: 'Larsemann Hills, Prydz Bay, East Antarctica',
    stationType: 'Permanent Year-Round Coastal Station',
    commissioning: '2012 (31st Indian Scientific Expedition to Antarctica — ISEA)',
    status: 'Operational',
    capacity: {
      winter: 25,
      summer: 47,
      description: '25 core wintering crew, up to 47 summer scientists',
    },
    facilities: [
      '134 prefabricated ISO shipping containers integrated into an aerodynamic thermal envelope',
      'Double-skin insulated facade designed to prevent snow drift accumulation',
      'Seawater reverse-osmosis (RO) desalination plant and emergency snow-melt tanks',
      'Vacuum toilet waste evacuation system and biological effluent filtration plant',
      'Combined heat and power (CHP) plant with 3x Volvo Penta 200 kVA generators',
      'Direct high-throughput satellite ground station radome for remote sensing and Earth observation downlinks',
      'Helipad certified for Kamov Ka-32 and Eurocopter AS350 B3 sorties',
      'Modern analytical chemistry, microbiology and oceanography wet/dry laboratories',
    ],
    meteorologicalAvailability: {
      provider: 'India Meteorological Department (IMD)',
      stationCode: '89512',
      parameters: ['Air Temperature', 'Surface Pressure', 'Wind Speed', 'Wind Direction', 'Relative Humidity', 'Solar Irradiance', 'Oceanographic CTD'],
      archiveStatus: 'Continuous digital AWS telemetry since March 2012',
      sourceUrl: 'https://www.data.ncpor.res.in/',
    },
    source: 'National Centre for Polar and Ocean Research (NCPOR), MoES',
    sourceUrl: 'https://npdc.ncpor.res.in/npdc/research-stations.action',
    dataStatus: 'OFFICIAL REFERENCE',
    notes: 'Located between Thala Fjord and Quilty Bay in the Larsemann Hills. One of the world\'s most technologically advanced green polar stations.',
  },
  {
    id: 'LOC-HIMADRI',
    name: 'Himadri Station (Arctic)',
    hindiName: 'हिमाद्रि अनुसंधान केंद्र',
    latitude: 78.9167,
    longitude: 11.9333,
    coordinatesFormatted: '78°55′00″ N, 11°56′00″ E',
    elevation: 15,
    elevationFormatted: '15 m above MSL',
    country: 'India',
    region: 'Ny-Ålesund, Spitsbergen, Svalbard (High Arctic)',
    stationType: 'International Arctic Research Base',
    commissioning: '2008',
    status: 'Operational (Year-Round & Seasonal Campaigns)',
    capacity: {
      winter: 4,
      summer: 8,
      description: 'Up to 8 visiting research scientists per rotation',
    },
    facilities: [
      'Glaciological mass-balance research instruments',
      'Atmospheric aerosol optical depth (AOD) sky radiometers',
      'Marine biogeochemical laboratory (Kongsfjorden fjord sampling)',
      'Upper atmosphere auroral optics and micro-pulsation magnetometers',
    ],
    meteorologicalAvailability: {
      provider: 'Kings Bay AS & NCPOR Arctic Atmospheric Program',
      stationCode: '01007',
      parameters: ['Surface Meteorology', 'Black Carbon Mass Concentration', 'Aerosol Scattering Coefficients'],
      archiveStatus: 'Long-term research archives on NCPOR Polar Data Centre',
      sourceUrl: 'https://npdc.ncpor.res.in/pdc/',
    },
    source: 'NCPOR Arctic Research Programme, MoES',
    sourceUrl: 'https://npdc.ncpor.res.in/npdc/research-stations.action',
    dataStatus: 'OFFICIAL REFERENCE',
    notes: 'India\'s first permanent research station in the Arctic, situated 1,200 km south of the North Pole in Svalbard under the Spitsbergen Treaty.',
  },
  {
    id: 'LOC-INDIA-BAY',
    name: 'India Bay Ice Shelf Depot',
    hindiName: 'इंडिया बे शेल्फ डिपो',
    latitude: -70.0833,
    longitude: 12.0000,
    coordinatesFormatted: '70°05′00″ S, 12°00′00″ E',
    elevation: 0,
    elevationFormatted: '0 m (Sea-Ice Fast-Shelf Margin)',
    country: 'India / International Waters',
    region: 'Princess Astrid Coast, Queen Maud Land',
    stationType: 'Maritime Fast-Ice Cargo Berthing Shelf & Staging Node',
    commissioning: '1981 (1st ISEA Expedition)',
    status: 'Seasonal (December to March)',
    capacity: {
      winter: 0,
      summer: 20,
      description: 'Transient logistics transfer depot for heavy resupply convoys',
    },
    facilities: [
      'Temporary fuel bladder storage and bunkering pumps',
      'Offshore fast-ice mooring bollards for chartered icebreaker (MV Vasiliy Golovnin)',
      'Heavy cargo sled marshalling yard for PistenBully 300 traverse convoys',
      'Emergency survival container shelter and satellite comms repeater',
    ],
    meteorologicalAvailability: {
      provider: 'Expedition Vessel Weather Radar & Portable Marine AWS',
      stationCode: 'IND-BAY-01',
      parameters: ['Wind Speed/Gusts', 'Visibility (Whiteout)', 'Sea-Ice Thickness', 'Air Temperature'],
      archiveStatus: 'Expedition cruise reports published in NCPOR Technical Volumes',
      sourceUrl: 'https://npdc.ncpor.res.in/pdc/',
    },
    source: 'NCPOR Logistics & Antarctic Operations Division',
    sourceUrl: 'https://npdc.ncpor.res.in/pdc/',
    dataStatus: 'OFFICIAL REFERENCE',
    notes: 'Origin point for the 90-km heavy inland snow-cat traverse up the continental ice slope to Maitri Station.',
  },
  {
    id: 'LOC-PRIYADARSHINI',
    name: 'Priyadarshini Lake Outpost',
    hindiName: 'प्रियदर्शिनी झील जल पंपिंग केंद्र',
    latitude: -70.7678,
    longitude: 11.7367,
    coordinatesFormatted: '70°46′04″ S, 11°44′12″ E',
    elevation: 120,
    elevationFormatted: '120 m above MSL',
    country: 'India',
    region: 'Schirmacher Oasis, East Antarctica',
    stationType: 'Critical Freshwater Pumping & Limnology Outpost',
    commissioning: '1989',
    status: 'Operational (Maintained Daily)',
    capacity: {
      winter: 0,
      summer: 4,
      description: 'Field shelter for maintenance engineers and freshwater limnologists',
    },
    facilities: [
      'Submersible lake water pumps with backup redundant line',
      'Electric trace-heated insulated pipeline connecting to Maitri Station storage tanks',
      'Emergency survival refuge cabin with 7-day provisions and VHF radio',
      'Water quality monitoring instruments (temperature, pH, dissolved oxygen)',
    ],
    meteorologicalAvailability: {
      provider: 'Maitri Meteorological Sub-Station',
      stationCode: 'MAITRI-LAKE',
      parameters: ['Water Temperature', 'Ice Thickness Profile', 'Ambient Air Temperature'],
      archiveStatus: 'NCPOR Limnological Technical Bulletins',
      sourceUrl: 'https://npdc.ncpor.res.in/pdc/',
    },
    source: 'NCPOR Antarctic Operations & Environmental Protocol Compliance',
    sourceUrl: 'https://npdc.ncpor.res.in/pdc/',
    dataStatus: 'OFFICIAL REFERENCE',
    notes: 'Specially protected water body supplying 100% of potable and boiler water for Maitri Station under strict Madrid Protocol environmental safeguards.',
  },
]

/**
 * Find official station metadata by station ID
 */
export function getStationById(id) {
  return OFFICIAL_STATIONS.find((s) => s.id === id) || null
}

/**
 * Return primary Indian Antarctic stations (Maitri and Bharati)
 */
export function getIndianAntarcticStations() {
  return OFFICIAL_STATIONS.filter((s) => s.id === 'LOC-MAITRI' || s.id === 'LOC-BHARATI')
}

/**
 * Return all official stations
 */
export function getAllOfficialStations() {
  return OFFICIAL_STATIONS
}
