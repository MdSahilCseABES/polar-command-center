/**
 * GLOBE VIEW — Interactive 3D Realistic Earth & Polar Operations Console
 * =====================================================================
 * A hardware-accelerated 3D WebGL sphere powered by Three.js.
 * Provides true spherical geometry where rotating towards polar theaters
 * foreshortens distant horizons, expands the target operational theater,
 * and renders realistic textures, ocean bathymetry, ice caps, atmosphere,
 * space starfields, and interactive 3D asset telemetry pins.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import {
  Compass,
  Crosshair,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Users,
  Wind,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { LOCATION_TYPE, PERSONNEL_STATUS, EMERGENCY_TYPE, SEVERITY, statusLabel } from '../lib/statuses'
import { formatCoords } from '../lib/format'

/* Radius of the 3D Globe in Three.js units */
const GLOBE_RADIUS = 120

/** Converts lat/lng to 3D Cartesian coordinates on sphere */
function latLngToVector3(lat, lng, radius = GLOBE_RADIUS) {
  const phi = (lat * Math.PI) / 180
  const theta = (lng * Math.PI) / 180
  const x = radius * Math.cos(phi) * Math.sin(theta)
  const y = radius * Math.sin(phi)
  const z = radius * Math.cos(phi) * Math.cos(theta)
  return new THREE.Vector3(x, y, z)
}

/** Inverse: converts 3D Cartesian vector on sphere to lat/lng */
function vector3ToLatLng(vec) {
  const norm = vec.clone().normalize()
  const lat = Math.asin(Math.min(Math.max(norm.y, -1), 1)) * (180 / Math.PI)
  const lng = Math.atan2(norm.x, norm.z) * (180 / Math.PI)
  return { lat, lng }
}

/** Generates a high-resolution procedural realistic Earth canvas texture */
function generateEarthTextureCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024
  const ctx = canvas.getContext('2d')

  // 1. Deep Ocean Gradient with Bathymetry
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height)
  oceanGrad.addColorStop(0, '#0a2342')    // Arctic Ocean deep navy
  oceanGrad.addColorStop(0.18, '#0d325e') // Northern temperate deep blue
  oceanGrad.addColorStop(0.5, '#07203e')  // Equatorial deep abyss
  oceanGrad.addColorStop(0.82, '#0c2d54') // Southern Ocean deep
  oceanGrad.addColorStop(1, '#0e3a6c')    // Antarctic coastal seas
  ctx.fillStyle = oceanGrad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 2. Graticule (Tactical lat/long grid lines)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)'
  ctx.lineWidth = 1
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * canvas.height
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }
  for (let lng = -180; lng <= 180; lng += 30) {
    const x = ((lng + 180) / 360) * canvas.width
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvas.height)
    ctx.stroke()
  }

  // Highlight Equator & Polar Circles
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)'
  ctx.lineWidth = 1.5
  // Equator
  ctx.beginPath()
  ctx.moveTo(0, canvas.height / 2)
  ctx.lineTo(canvas.width, canvas.height / 2)
  ctx.stroke()
  // Antarctic Circle (66.5° S)
  const antarcticY = ((90 - -66.5) / 180) * canvas.height
  ctx.beginPath()
  ctx.moveTo(0, antarcticY)
  ctx.lineTo(canvas.width, antarcticY)
  ctx.stroke()
  // Arctic Circle (66.5° N)
  const arcticY = ((90 - 66.5) / 180) * canvas.height
  ctx.beginPath()
  ctx.moveTo(0, arcticY)
  ctx.lineTo(canvas.width, arcticY)
  ctx.stroke()

  // Helper to draw realistic landmass curves
  function toX(lng) { return ((lng + 180) / 360) * canvas.width }
  function toY(lat) { return ((90 - lat) / 180) * canvas.height }

  function drawLandPoly(coords, fill, stroke) {
    ctx.fillStyle = fill
    ctx.strokeStyle = stroke || 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    coords.forEach(([lat, lng], i) => {
      const x = toX(lng)
      const y = toY(lat)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // 3. Realistic Continental Landmasses
  const landGreen = '#1f4d36'
  const landTan = '#5c4832'
  const landCoast = 'rgba(34, 197, 94, 0.3)'

  // Africa
  drawLandPoly([
    [37, 10], [35, -5], [30, -10], [15, -17], [5, -10], [4, 8], [12, 15],
    [5, 48], [-12, 40], [-25, 33], [-34, 18], [-34, 26], [-28, 32], [-15, 41],
    [0, 42], [11, 43], [12, 51], [22, 38], [30, 32], [32, 24], [37, 10]
  ], landTan, landCoast)

  // Eurasia (Europe + Asia)
  drawLandPoly([
    [36, -9], [43, -9], [48, -4], [54, 4], [58, 8], [62, 5], [71, 26],
    [70, 40], [72, 70], [77, 104], [70, 160], [66, 170], [60, 165],
    [50, 140], [40, 130], [30, 122], [22, 114], [10, 105], [1, 104],
    [15, 96], [22, 90], [22, 69], [25, 56], [30, 48], [31, 35], [37, 26],
    [41, 15], [36, 5], [36, -9]
  ], landGreen, landCoast)

  // Indian Subcontinent (Highlighted with green & MoES origin)
  drawLandPoly([
    [35, 74], [32, 78], [28, 88], [25, 93], [21, 88], [16, 82], [10, 80],
    [8, 77.5], [10, 76], [15.4, 73.8], [19, 72.8], [24, 68], [27, 71],
    [32, 70], [35, 74]
  ], '#2a6a4e', 'rgba(14, 165, 233, 0.6)')

  // North America
  drawLandPoly([
    [70, -165], [71, -156], [70, -135], [70, -90], [62, -65], [52, -55],
    [45, -63], [30, -81], [25, -80], [26, -97], [20, -105], [15, -92],
    [8, -82], [8, -77], [16, -95], [23, -110], [32, -117], [38, -123],
    [48, -125], [55, -132], [60, -145], [65, -168], [70, -165]
  ], landGreen, landCoast)

  // South America
  drawLandPoly([
    [12, -72], [10, -62], [5, -52], [-3, -40], [-10, -36], [-22, -41],
    [-34, -53], [-45, -65], [-55, -67], [-53, -74], [-45, -75], [-35, -72],
    [-18, -71], [-5, -81], [5, -77], [12, -72]
  ], landGreen, landCoast)

  // Australia
  drawLandPoly([
    [-12, 131], [-15, 136], [-12, 142], [-22, 150], [-32, 153], [-38, 145],
    [-35, 117], [-22, 114], [-15, 124], [-12, 131]
  ], landTan, landCoast)

  // 4. ARCTIC REGION: Greenland Ice Sheet & Svalbard (High Arctic)
  // Greenland
  drawLandPoly([
    [83, -30], [80, -20], [70, -22], [60, -43], [65, -52], [76, -68],
    [82, -60], [83, -30]
  ], '#f1f5f9', 'rgba(14, 165, 233, 0.7)')

  // Svalbard Archipelago (Himadri Station)
  drawLandPoly([
    [80.5, 16], [80, 25], [77, 24], [76.5, 16], [78.9, 11.9], [80.5, 16]
  ], '#ffffff', 'rgba(14, 165, 233, 0.9)')

  // 5. ANTARCTIC CONTINENT & ICE SHELVES (The Heart of Polar Operations)
  // Antarctica spans the entire southern latitude from -60° to -90°
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.85)'
  ctx.lineWidth = 2
  ctx.beginPath()

  // Full continental Antarctic perimeter with realistic peninsulas and ice shelves
  const antarcticPoints = [
    [-63, -57],  // Antarctic Peninsula tip
    [-65, -64],  // Palmer Land
    [-71, -74],  // Alexander Island
    [-73, -95],  // Ellsworth Land coast
    [-74, -110], // Marie Byrd Land
    [-76, -135], // Amundsen Sea coast
    [-77, -155], // Ross Ice Shelf West
    [-84, -175], // Deep Ross Shelf
    [-78, 165],  // McMurdo Sound / Victoria Land
    [-70, 160],  // Cape Adare
    [-66, 140],  // Wilkes Land / Terre Adélie
    [-65, 110],  // Sabrina Coast
    [-66, 95],   // Shackleton Ice Shelf
    [-69.4, 76.2], // BHARATI STATION / Larsemann Hills
    [-67, 60],   // Enderby Land
    [-70.8, 11.7], // MAITRI STATION / Schirmacher Oasis
    [-70, -5],   // Queen Maud Land / Fimbul Ice Shelf
    [-75, -35],  // Weddell Sea / Ronne Ice Shelf
    [-72, -50],  // Palmer Coast
    [-63, -57]   // Back to Peninsula
  ]

  antarcticPoints.forEach(([lat, lng], i) => {
    const x = toX(lng)
    const y = toY(lat)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  // Fill down to South Pole edge
  ctx.lineTo(canvas.width, canvas.height)
  ctx.lineTo(0, canvas.height)
  ctx.closePath()

  // Shaded polar ice gradient
  const iceGrad = ctx.createLinearGradient(0, toY(-60), 0, canvas.height)
  iceGrad.addColorStop(0, '#e0f2fe')
  iceGrad.addColorStop(0.3, '#ffffff')
  iceGrad.addColorStop(0.8, '#f8fafc')
  iceGrad.addColorStop(1, '#e2e8f0')
  ctx.fillStyle = iceGrad
  ctx.fill()
  ctx.stroke()

  // Draw ice-shelf crevasses / texture lines
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.3)'
  ctx.lineWidth = 1
  for (let i = 0; i < 24; i++) {
    const startX = (i / 24) * canvas.width
    ctx.beginPath()
    ctx.moveTo(startX, toY(-70))
    ctx.lineTo(startX + (Math.sin(i) * 30), canvas.height - 15)
    ctx.stroke()
  }

  return canvas
}

export default function GlobeView({
  locations = [],
  people = [],
  openIncidents = [],
  userLocation = null,
  customPoint = null,
  selected = null,
  onSelectEntity,
  onSelectCustomPoint,
  onClearCustomPoint,
  getTerritoryInfo,
  formatCoords: fmtCoords = formatCoords,
  minimized = false,
}) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const globeGroupRef = useRef(null)
  const earthMeshRef = useRef(null)
  const pinsGroupRef = useRef(null)
  const starsRef = useRef(null)
  const reqIdRef = useRef(null)

  // Interaction State
  const [autoRotate, setAutoRotate] = useState(true)
  const [hoveredInfo, setHoveredInfo] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const previousMousePositionRef = useRef({ x: 0, y: 0 })
  const targetRotationRef = useRef({ x: 0.35, y: -0.4 }) // Initial view slightly tilted towards Southern Ocean
  const currentRotationRef = useRef({ x: 0.35, y: -0.4 })
  const targetZoomRef = useRef(290)
  const currentZoomRef = useRef(290)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseVecRef = useRef(new THREE.Vector2())

  /* ---------- THREE.JS INITIALIZATION ---------- */
  useEffect(() => {
    const container = mountRef.current
    if (!container) return undefined

    const width = container.clientWidth || 600
    const height = container.clientHeight || 500

    // 1. Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000)
    camera.position.set(0, 0, currentZoomRef.current)
    cameraRef.current = camera

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.innerHTML = ''
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xe0f2fe, 1.8)
    sunLight.position.set(300, 200, 250)
    scene.add(sunLight)

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6)
    fillLight.position.set(-300, -100, -200)
    scene.add(fillLight)

    // 5. Starfield Background (Deep Space Immersion)
    const starsGeo = new THREE.BufferGeometry()
    const starsCount = 1200
    const starPositions = new Float32Array(starsCount * 3)
    for (let i = 0; i < starsCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 2200
      starPositions[i + 1] = (Math.random() - 0.5) * 2200
      starPositions[i + 2] = (Math.random() - 0.5) * 2200
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starsMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 1.5,
      transparent: true,
      opacity: 0.65,
    })
    const stars = new THREE.Points(starsGeo, starsMat)
    scene.add(stars)
    starsRef.current = stars

    // 6. Globe Master Group (rotates everything together)
    const globeGroup = new THREE.Group()
    scene.add(globeGroup)
    globeGroupRef.current = globeGroup

    // 7. Earth Surface Sphere
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64)
    const canvasTexture = new THREE.CanvasTexture(generateEarthTextureCanvas())
    canvasTexture.wrapS = THREE.RepeatWrapping
    canvasTexture.wrapT = THREE.ClampToEdgeWrapping

    const earthMat = new THREE.MeshPhongMaterial({
      map: canvasTexture,
      shininess: 18,
      specular: new THREE.Color(0x0e386b),
      emissive: new THREE.Color(0x020a14),
    })
    const earthMesh = new THREE.Mesh(earthGeo, earthMat)
    earthMesh.name = 'earth_surface'
    globeGroup.add(earthMesh)
    earthMeshRef.current = earthMesh

    // Asynchronously attempt to load photorealistic NASA satellite imagery
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(
      'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
      (loadedTexture) => {
        if (earthMat) {
          loadedTexture.wrapS = THREE.RepeatWrapping
          loadedTexture.wrapT = THREE.ClampToEdgeWrapping
          earthMat.map = loadedTexture
          earthMat.needsUpdate = true
        }
      },
      undefined,
      () => {
        // Silent fallback: procedural high-res texture is already active
      }
    )

    // 8. Glowing Atmospheric Rim Layer
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.022, 64, 64)
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    })
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat)
    globeGroup.add(atmosMesh)

    // 9. Pins Group for 3D Markers
    const pinsGroup = new THREE.Group()
    globeGroup.add(pinsGroup)
    pinsGroupRef.current = pinsGroup

    // Handle Container Resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect
        if (newW && newH && renderer && camera) {
          camera.aspect = newW / newH
          camera.updateProjectionMatrix()
          renderer.setSize(newW, newH)
        }
      }
    })
    resizeObserver.observe(container)

    // Animation Render Loop
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate)

      // Smooth Rotation Damping (Inertia)
      if (autoRotate && !isDraggingRef.current) {
        targetRotationRef.current.y += 0.0018
      }

      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.1
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.1
      globeGroup.rotation.x = currentRotationRef.current.x
      globeGroup.rotation.y = currentRotationRef.current.y

      // Smooth Zoom Damping
      currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * 0.12
      camera.position.z = currentZoomRef.current

      // Slow twinkle on stars
      if (stars) {
        stars.rotation.y += 0.0002
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current)
      resizeObserver.disconnect()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [autoRotate])

  /* ---------- DRAW 3D MARKER PINS ON THE GLOBE ---------- */
  useEffect(() => {
    const pinsGroup = pinsGroupRef.current
    if (!pinsGroup) return

    // Clear old 3D pins
    while (pinsGroup.children.length > 0) {
      const obj = pinsGroup.children[0]
      pinsGroup.remove(obj)
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
        else obj.material.dispose()
      }
    }

    // Marker colors mapping
    const siteColorHex = {
      STATION: 0x38bdf8, // Ice
      CAMP: 0x3b82f6,    // Blue
      VESSEL: 0x8b5cf6,  // Violet
      RUNWAY: 0xf59e0b,  // Amber
      DEPOT: 0x64748b,   // Slate
      PORT: 0x64748b,    // Slate
      HQ: 0x22c55e,      // Green
    }

    const personColorHex = {
      ACTIVE: 0x22c55e,
      IN_TRANSIT: 0x38bdf8,
      RESTING: 0x3b82f6,
      EMERGENCY: 0xef4444,
      OFF_DUTY: 0x64748b,
    }

    // Helper to spawn an interactive 3D pin on the sphere
    function addPin({
      lat,
      lng,
      color = 0x38bdf8,
      size = 3.5,
      height = 7,
      isPulsing = false,
      isEmergency = false,
      data,
    }) {
      const pos = latLngToVector3(lat, lng, GLOBE_RADIUS)
      const pinObj = new THREE.Group()
      pinObj.position.copy(pos)

      // Orient pin normal to sphere surface
      pinObj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize())

      // 1. Vertical Telemetry Stem
      const stemGeo = new THREE.CylinderGeometry(0.6, 0.6, height, 8)
      const stemMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
      const stemMesh = new THREE.Mesh(stemGeo, stemMat)
      stemMesh.position.y = height / 2
      pinObj.add(stemMesh)

      // 2. Glowing Head Marker (Sphere / Diamond)
      const headGeo = isEmergency
        ? new THREE.OctahedronGeometry(size * 1.3, 0)
        : new THREE.SphereGeometry(size, 12, 12)
      const headMat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: isEmergency ? 0.9 : 0.6,
        shininess: 30,
      })
      const headMesh = new THREE.Mesh(headGeo, headMat)
      headMesh.position.y = height + size / 2
      headMesh.userData = data
      pinObj.add(headMesh)

      // 3. Ground Radar Ring on Surface
      const ringGeo = new THREE.RingGeometry(size * 0.8, size * 1.4, 16)
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isPulsing ? 0.7 : 0.4,
      })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.rotation.x = Math.PI / 2
      ringMesh.position.y = 0.4
      pinObj.add(ringMesh)

      pinsGroup.add(pinObj)
    }

    // 1. Plot Sites
    locations.forEach((site) => {
      if (!Number.isFinite(Number(site.latitude)) || !Number.isFinite(Number(site.longitude))) return
      const color = siteColorHex[site.type] || 0x38bdf8
      const isSelected = selected?.kind === 'site' && selected.id === site.id
      addPin({
        lat: Number(site.latitude),
        lng: Number(site.longitude),
        color,
        size: isSelected ? 4.8 : 3.6,
        height: isSelected ? 12 : 8,
        isPulsing: isSelected || site.type === 'STATION',
        data: { kind: 'site', id: site.id, raw: site },
      })
    })

    // 2. Plot Personnel
    people.forEach((p) => {
      if (!Number.isFinite(Number(p.latitude)) || !Number.isFinite(Number(p.longitude))) return
      const color = personColorHex[p.status] || 0x22c55e
      const isEmergency = p.status === 'EMERGENCY'
      const isSelected = selected?.kind === 'person' && selected.id === p.id
      addPin({
        lat: Number(p.latitude),
        lng: Number(p.longitude),
        color,
        size: isSelected ? 4 : isEmergency ? 4.2 : 2.6,
        height: isSelected ? 10 : isEmergency ? 11 : 6,
        isPulsing: isEmergency || isSelected,
        isEmergency,
        data: { kind: 'person', id: p.id, raw: p },
      })
    })

    // 3. Plot Open Incidents
    openIncidents.forEach((inc) => {
      if (!Number.isFinite(Number(inc.latitude)) || !Number.isFinite(Number(inc.longitude))) return
      const isSelected = selected?.kind === 'incident' && selected.id === inc.id
      addPin({
        lat: Number(inc.latitude),
        lng: Number(inc.longitude),
        color: 0xef4444, // Red
        size: isSelected ? 5.5 : 4.4,
        height: isSelected ? 14 : 11,
        isPulsing: true,
        isEmergency: true,
        data: { kind: 'incident', id: inc.id, raw: inc },
      })
    })

    // 4. Plot Active Workstation
    if (userLocation) {
      addPin({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        color: 0x38bdf8,
        size: 4.2,
        height: 10,
        isPulsing: true,
        data: { kind: 'current_location', id: 'active_workstation', raw: userLocation },
      })
    }

    // 5. Plot Custom Survey Pin
    if (customPoint) {
      addPin({
        lat: customPoint.lat,
        lng: customPoint.lng,
        color: 0xf59e0b, // Amber
        size: 4.8,
        height: 12,
        isPulsing: true,
        data: { kind: 'custom_point', id: 'survey_point', raw: customPoint },
      })
    }
  }, [locations, people, openIncidents, userLocation, customPoint, selected])

  /* ---------- SMOOTH CAMERA THEATER PRESETS ---------- */
  const flyToCoords = useCallback((targetLat, targetLng, zoom = 240) => {
    // Pitch (X): -lat in radians
    const pitch = (targetLat * Math.PI) / 180
    // Yaw (Y): -lng in radians
    const yaw = (-targetLng * Math.PI) / 180

    targetRotationRef.current.x = pitch
    targetRotationRef.current.y = yaw
    targetZoomRef.current = zoom
    setAutoRotate(false)
  }, [])

  /* Auto-rotate / fly to selected entity if selected changes externally */
  useEffect(() => {
    if (!selected) return
    let targetCoords = null
    if (selected.kind === 'site') {
      const loc = locations.find((l) => l.id === selected.id)
      if (loc && Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude))) {
        targetCoords = [Number(loc.latitude), Number(loc.longitude)]
      }
    } else if (selected.kind === 'person') {
      const p = people.find((item) => item.id === selected.id)
      if (p && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))) {
        targetCoords = [Number(p.latitude), Number(p.longitude)]
      }
    } else if (selected.kind === 'incident') {
      const inc = openIncidents.find((item) => item.id === selected.id)
      if (inc && Number.isFinite(Number(inc.latitude)) && Number.isFinite(Number(inc.longitude))) {
        targetCoords = [Number(inc.latitude), Number(inc.longitude)]
      }
    } else if (selected.kind === 'custom_point' && customPoint) {
      targetCoords = [Number(customPoint.lat), Number(customPoint.lng)]
    }

    if (targetCoords) {
      flyToCoords(targetCoords[0], targetCoords[1], 220)
    }
  }, [selected?.kind, selected?.id, customPoint?.lat, customPoint?.lng, locations, people, openIncidents, flyToCoords])

  /* ---------- MOUSE INTERACTION (ROTATE, DRAG, CLICK, ZOOM) ---------- */
  const handleMouseDown = (e) => {
    isDraggingRef.current = true
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e) => {
    const container = mountRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    mouseVecRef.current.set(x, y)
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })

    // If dragging: rotate globe
    if (isDraggingRef.current) {
      const deltaX = e.clientX - previousMousePositionRef.current.x
      const deltaY = e.clientY - previousMousePositionRef.current.y

      targetRotationRef.current.y += deltaX * 0.0055
      // Clamped vertical pitch so Antarctica and Arctic can be tilted into full view
      targetRotationRef.current.x = Math.max(
        -Math.PI * 0.48,
        Math.min(Math.PI * 0.48, targetRotationRef.current.x + deltaY * 0.0055)
      )

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY }
      return
    }

    // Raycast for Hover Tooltip
    if (cameraRef.current && pinsGroupRef.current) {
      raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current)
      const intersects = raycasterRef.current.intersectObjects(pinsGroupRef.current.children, true)
      const validHit = intersects.find((h) => h.object.userData?.kind)

      if (validHit) {
        setHoveredInfo(validHit.object.userData)
      } else {
        setHoveredInfo(null)
      }
    }
  }

  const handleMouseUp = (e) => {
    // Only treat as click if dragged minimally
    const deltaX = Math.abs(e.clientX - previousMousePositionRef.current.x)
    const deltaY = Math.abs(e.clientY - previousMousePositionRef.current.y)
    isDraggingRef.current = false

    if (deltaX < 5 && deltaY < 5) {
      // Raycast click
      if (!cameraRef.current || !globeGroupRef.current) return
      raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current)

      // 1. Check if clicked a pin first
      const pinHits = raycasterRef.current.intersectObjects(pinsGroupRef.current.children, true)
      const pinHit = pinHits.find((h) => h.object.userData?.kind)

      if (pinHit) {
        const { kind, id, raw } = pinHit.object.userData
        if (onSelectEntity) onSelectEntity(kind, id)
        const lat = Number(raw.latitude ?? raw.lat)
        const lng = Number(raw.longitude ?? raw.lng)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          flyToCoords(lat, lng, 220)
        }
        return
      }

      // 2. Check if clicked on Earth sphere (Arbitrary Survey Pin)
      if (earthMeshRef.current) {
        const earthHits = raycasterRef.current.intersectObject(earthMeshRef.current)
        if (earthHits.length > 0) {
          const hit = earthHits[0]
          // Convert world point to globe group local space
          const localPoint = globeGroupRef.current.worldToLocal(hit.point.clone())
          const { lat, lng } = vector3ToLatLng(localPoint)

          if (onSelectCustomPoint) {
            onSelectCustomPoint(lat, lng)
          }
        }
      }
    }
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const zoomDelta = e.deltaY * 0.15
    targetZoomRef.current = Math.max(170, Math.min(420, targetZoomRef.current + zoomDelta))
  }

  return (
    <div className={`relative w-full ${minimized ? 'h-[280px] sm:h-[300px] lg:h-[340px]' : 'h-[450px] lg:h-[580px]'} bg-[#020a14] rounded-xl overflow-hidden border border-[var(--line)] shadow-lg select-none group transition-[height] duration-200`}>
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Floating HUD: Theatre Presets Bar (Top Left) */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 bg-[var(--surface-card)]/90 backdrop-blur-md p-1.5 rounded-lg border border-[var(--line)] shadow-md">
        <span className="text-[10px] font-semibold text-low uppercase tracking-wider px-1 flex items-center gap-1">
          <Compass size={12} className="text-[var(--ice)]" /> Orbit Theatre:
        </span>
        <button
          type="button"
          onClick={() => flyToCoords(-72, 45, 230)}
          className="btn btn--ghost btn--sm text-[11px] py-0.5 px-2 hover:bg-[var(--ice)]/15 hover:text-[var(--ice)]"
          title="Focus South Pole & Antarctic Stations (Maitri, Bharati)"
        >
          🇦🇶 Antarctica
        </button>
        <button
          type="button"
          onClick={() => flyToCoords(79, 15, 230)}
          className="btn btn--ghost btn--sm text-[11px] py-0.5 px-2 hover:bg-[var(--ice)]/15 hover:text-[var(--ice)]"
          title="Focus North Pole & Himadri Arctic Base"
        >
          ❄️ Arctic
        </button>
        <button
          type="button"
          onClick={() => flyToCoords(-46, 32, 250)}
          className="btn btn--ghost btn--sm text-[11px] py-0.5 px-2 hover:bg-[var(--ice)]/15 hover:text-[var(--ice)]"
          title="Focus Southern Ocean & Sagar Nidhi Corridor"
        >
          🌊 Southern Ocean
        </button>
        <button
          type="button"
          onClick={() => flyToCoords(18, 75, 250)}
          className="btn btn--ghost btn--sm text-[11px] py-0.5 px-2 hover:bg-[var(--ice)]/15 hover:text-[var(--ice)]"
          title="Focus India NCPOR HQ Mission Control"
        >
          🇮🇳 India HQ
        </button>
      </div>

      {/* Floating HUD: Controls Bar (Top Right) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-[var(--surface-card)]/90 backdrop-blur-md p-1.5 rounded-lg border border-[var(--line)] shadow-md">
        <button
          type="button"
          onClick={() => setAutoRotate((v) => !v)}
          className={`btn btn--sm text-xs py-1 px-2 flex items-center gap-1 ${
            autoRotate ? 'btn--primary' : 'btn--ghost'
          }`}
          title={autoRotate ? 'Pause 3D rotation' : 'Start auto-rotation'}
        >
          {autoRotate ? <Pause size={12} /> : <Play size={12} />}
          <span>{autoRotate ? 'Rotating' : 'Paused'}</span>
        </button>

        <div className="w-[1px] h-4 bg-[var(--line)] mx-0.5" />

        <button
          type="button"
          onClick={() => {
            targetZoomRef.current = Math.max(170, targetZoomRef.current - 35)
          }}
          className="btn btn--ghost btn--sm p-1.5"
          title="Zoom In"
        >
          <ZoomIn size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            targetZoomRef.current = Math.min(420, targetZoomRef.current + 35)
          }}
          className="btn btn--ghost btn--sm p-1.5"
          title="Zoom Out"
        >
          <ZoomOut size={13} />
        </button>
        <button
          type="button"
          onClick={() => {
            targetRotationRef.current = { x: 0.35, y: -0.4 }
            targetZoomRef.current = 290
          }}
          className="btn btn--ghost btn--sm p-1.5"
          title="Reset View"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Floating Status & Interaction Hint (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 bg-[var(--surface-card)]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[var(--line)] text-[11px] text-mid">
        <Sparkles size={12} className="text-[var(--amber)]" />
        <span>
          <strong className="text-hi font-medium">3D Spherical Orbit.</strong> Drag to rotate · Scroll to zoom · Click ANY location on the sphere to drop a survey pin.
        </span>
      </div>

      {/* Active Selection Indicator (Bottom Right) */}
      {selected && (
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 bg-[var(--surface-card)]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[var(--line)] text-xs text-hi shadow-md">
          <span className="h-2 w-2 rounded-full bg-[var(--ice)] animate-ping" />
          <span className="font-mono text-[11px] uppercase font-semibold text-[var(--ice)]">
            {selected.kind}: {selected.id}
          </span>
          {customPoint && selected.kind === 'custom_point' && (
            <button
              type="button"
              onClick={onClearCustomPoint}
              className="text-low hover:text-hi text-[11px] underline ml-1"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* 3D Hover Tooltip Glassmorphic HUD */}
      {hoveredInfo && (
        <div
          style={{
            position: 'absolute',
            left: `${mousePos.x + 15}px`,
            top: `${mousePos.y - 45}px`,
            pointerEvents: 'none',
          }}
          className="z-30 rounded-lg border border-[var(--line)] bg-[var(--surface-card)]/95 backdrop-blur-md p-2.5 shadow-xl text-xs min-w-[190px] animate-in fade-in zoom-in-95 duration-100"
        >
          {hoveredInfo.kind === 'site' && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase text-[var(--ice)] bg-[var(--ice)]/15 px-1.5 py-0.5 rounded">
                  {statusLabel(LOCATION_TYPE, hoveredInfo.raw.type)}
                </span>
                <span className="text-[10px] font-mono text-low">
                  {fmtCoords(hoveredInfo.raw.latitude, hoveredInfo.raw.longitude)}
                </span>
              </div>
              <div className="font-bold text-hi text-[12px]">{hoveredInfo.raw.name}</div>
              <div className="text-[10px] text-mid mt-0.5">{hoveredInfo.raw.region}</div>
            </div>
          )}

          {hoveredInfo.kind === 'person' && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                  {statusLabel(PERSONNEL_STATUS, hoveredInfo.raw.status)}
                </span>
                <span className="text-[10px] font-mono text-low">
                  {fmtCoords(hoveredInfo.raw.latitude, hoveredInfo.raw.longitude)}
                </span>
              </div>
              <div className="font-bold text-hi text-[12px]">{hoveredInfo.raw.name}</div>
              <div className="text-[10px] text-mid mt-0.5">{hoveredInfo.raw.role}</div>
            </div>
          )}

          {hoveredInfo.kind === 'incident' && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded">
                  {statusLabel(SEVERITY, hoveredInfo.raw.severity)}
                </span>
                <span className="text-[10px] font-mono text-low">{hoveredInfo.raw.id}</span>
              </div>
              <div className="font-bold text-hi text-[12px]">
                {hoveredInfo.raw.title || statusLabel(EMERGENCY_TYPE, hoveredInfo.raw.type)}
              </div>
              <div className="text-[10px] text-mid mt-0.5">{hoveredInfo.raw.location}</div>
            </div>
          )}

          {hoveredInfo.kind === 'custom_point' && (
            <div>
              <div className="text-[10px] font-bold uppercase text-amber-400 mb-1">
                Survey Target Pin
              </div>
              <div className="font-bold text-hi text-[12px]">
                {hoveredInfo.raw.territoryInfo?.country || 'Inspected Point'}
              </div>
              <div className="text-[10px] font-mono text-low mt-0.5">
                {fmtCoords(hoveredInfo.raw.lat, hoveredInfo.raw.lng)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
