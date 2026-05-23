import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Globe from 'react-globe.gl'
import type { GlobeMethods } from 'react-globe.gl'
import * as THREE from 'three'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { LayerState } from '../hooks/useLayers'
import type { DataPoint, LayerConfig } from '../layers/types'

interface CountryPolygon {
  geometry: GeoJSON.Geometry
  properties: {
    name: string
    country_id: string
    color: string
    opacity: number
  }
}

interface GlobeViewProps {
  layerStates: LayerState[]
  onSelectCountry: (countryId: string, countryName: string, points: DataPoint[]) => void
  selectedCategory: string | null
}

export default function GlobeView({ layerStates, onSelectCountry, selectedCategory }: GlobeViewProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [countries, setCountries] = useState<GeoJSON.Feature[]>([])
  const [countryNames, setCountryNames] = useState<Map<string, string>>(new Map())
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([])
  const [activeLayer, setActiveLayer] = useState<LayerConfig | null>(null)
  const initDone = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setContainerSize({ width, height })
    })
    ro.observe(el)
    setContainerSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    async function loadWorld() {
      const worldModule = await import('world-atlas/countries-110m.json')
      const topo = worldModule.default as unknown as Topology<{ countries: GeometryCollection }>
      const geo = topojson.feature(topo, topo.objects.countries) as GeoJSON.FeatureCollection

      const names = new Map<string, string>()
      for (const geom of topo.objects.countries.geometries) {
        names.set(String(geom.id), (geom.properties as { name: string }).name)
      }
      setCountries(geo.features)
      setCountryNames(names)
    }
    loadWorld()
  }, [])

  useEffect(() => {
    const visible = layerStates.find(ls => ls.visible)
    if (!visible) {
      setActiveLayer(null)
      setDataPoints([])
      return
    }
    setActiveLayer(visible.config)

    fetch(visible.config.dataUrl)
      .then(r => r.json())
      .then((geo: GeoJSON.FeatureCollection) => {
        const points = geo.features.map(f => visible.config.parseFeature(f))
        setDataPoints(points)
      })
  }, [layerStates])

  const autoRotateRaf = useRef<number>(0)
  const rotating = useRef(false)

  const startAutoRotate = useCallback(() => {
    if (rotating.current) return
    rotating.current = true
    const rotate = () => {
      if (!rotating.current) return
      const globe = globeRef.current
      if (globe) {
        const pov = globe.pointOfView()
        globe.pointOfView({ lat: pov.lat, lng: pov.lng + 0.03, altitude: pov.altitude }, 0)
      }
      autoRotateRaf.current = requestAnimationFrame(rotate)
    }
    autoRotateRaf.current = requestAnimationFrame(rotate)
  }, [])

  const stopAutoRotate = useCallback(() => {
    rotating.current = false
    if (autoRotateRaf.current) {
      cancelAnimationFrame(autoRotateRaf.current)
      autoRotateRaf.current = 0
    }
  }, [])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    const renderer = globe.renderer()
    const camera = globe.camera()
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const globeSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 100)

    const onMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hit = raycaster.ray.intersectsSphere(globeSphere)
      if (hit) {
        stopAutoRotate()
      } else if (!rotating.current) {
        startAutoRotate()
      }
    }
    const onLeave = () => startAutoRotate()

    renderer.domElement.addEventListener('mousemove', onMove)
    renderer.domElement.addEventListener('mouseleave', onLeave)
    startAutoRotate()
    return () => {
      renderer.domElement.removeEventListener('mousemove', onMove)
      renderer.domElement.removeEventListener('mouseleave', onLeave)
      stopAutoRotate()
    }
  }, [startAutoRotate, stopAutoRotate])

  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current
    if (!globe || initDone.current) return
    initDone.current = true

    globe.pointOfView({ lat: 30, lng: 105, altitude: 2.2 }, 0)

    const scene = globe.scene()
    const oldLights = scene.children.filter((c): c is THREE.Light => c instanceof THREE.Light)
    oldLights.forEach(light => scene.remove(light))

    scene.add(new THREE.AmbientLight(0xffffff, 2.0))
    const dir = new THREE.DirectionalLight(0xffffff, 1.5)
    dir.position.set(1, 1, 1)
    scene.add(dir)
  }, [])

  const filteredPoints = useMemo(() => {
    if (!selectedCategory) return dataPoints
    return dataPoints.filter(p => p.category === selectedCategory)
  }, [dataPoints, selectedCategory])

  const pointsByCountry = useMemo(() => {
    const map = new Map<string, DataPoint[]>()
    for (const p of filteredPoints) {
      const list = map.get(p.country_id) ?? []
      list.push(p)
      map.set(p.country_id, list)
    }
    return map
  }, [filteredPoints])

  const polygonsData = useMemo<CountryPolygon[]>(() => {
    if (!activeLayer?.getCountryColor) return []
    return countries.reduce<CountryPolygon[]>((acc, feature) => {
      const id = String(feature.id)
      const points = pointsByCountry.get(id)
      if (!points?.length) return acc
      const { color, opacity } = activeLayer.getCountryColor!(points)
      acc.push({
        geometry: feature.geometry,
        properties: {
          name: countryNames.get(id) ?? id,
          country_id: id,
          color,
          opacity,
        },
      })
      return acc
    }, [])
  }, [countries, pointsByCountry, activeLayer, countryNames])

  const handlePolygonClick = useCallback((polygon: object) => {
    const p = polygon as CountryPolygon
    const countryId = p.properties.country_id
    const name = p.properties.name
    const points = pointsByCountry.get(countryId)
    if (points?.length) {
      onSelectCountry(countryId, name, points)
    }
  }, [pointsByCountry, onSelectCountry])

  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const markerHovered = useRef(false)
  const mousePos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const tip = document.createElement('div')
    tip.style.cssText = `
      position:fixed;pointer-events:none;opacity:0;transition:opacity 0.15s;
      background:rgba(10,20,40,0.92);color:white;padding:10px 14px;border-radius:8px;
      font-size:12px;white-space:nowrap;z-index:99999;
      border:1px solid rgba(100,160,255,0.3);box-shadow:0 4px 12px rgba(0,0,0,0.4);
    `
    document.body.appendChild(tip)
    tooltipRef.current = tip

    if (!document.getElementById('marker-pulse-style')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'marker-pulse-style'
      styleEl.textContent = `
        @keyframes marker-pulse {
          0% { transform: translate(-50%,-50%) scale(1); opacity: 0.9; }
          100% { transform: translate(-50%,-50%) scale(3); opacity: 0; }
        }
      `
      document.head.appendChild(styleEl)
    }

    const onMove = (e: MouseEvent) => { mousePos.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMove)
    return () => {
      document.body.removeChild(tip)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  const handlePolygonHover = useCallback((polygon: object | null) => {
    const tip = tooltipRef.current
    if (!tip) return
    if (!polygon || markerHovered.current) {
      if (!markerHovered.current) tip.style.opacity = '0'
      return
    }
    const p = polygon as CountryPolygon
    const points = pointsByCountry.get(p.properties.country_id)
    tip.innerHTML = `<div style="font-size:14px;font-weight:bold;margin-bottom:4px">${p.properties.name}</div>
      <span style="color:#8bb8f0">${points?.length ?? 0} 个数据点</span>`
    tip.style.left = `${mousePos.current.x + 12}px`
    tip.style.top = `${mousePos.current.y - 12}px`
    tip.style.opacity = '1'
  }, [pointsByCountry])

  const createMarkerEl = useCallback((d: object) => {
    const point = d as DataPoint
    const style = activeLayer?.categories[point.category]
    const color = style?.color ?? '#95a5a6'
    const el = document.createElement('div')
    el.style.width = '24px'
    el.style.height = '24px'
    el.style.cursor = 'pointer'
    el.style.pointerEvents = 'auto'
    el.style.position = 'relative'

    const ring = document.createElement('div')
    ring.style.cssText = `
      position:absolute;top:50%;left:50%;width:100%;height:100%;
      border-radius:50%;border:3px solid ${color};
      box-shadow:0 0 6px ${color}, inset 0 0 4px ${color};
      transform:translate(-50%,-50%) scale(1);
      animation:marker-pulse 2s ease-out infinite;
      pointer-events:none;
    `
    el.appendChild(ring)

    const ring2 = document.createElement('div')
    ring2.style.cssText = `
      position:absolute;top:50%;left:50%;width:100%;height:100%;
      border-radius:50%;border:3px solid ${color};
      box-shadow:0 0 6px ${color}, inset 0 0 4px ${color};
      transform:translate(-50%,-50%) scale(1);
      animation:marker-pulse 2s ease-out infinite 1s;
      pointer-events:none;
    `
    el.appendChild(ring2)

    if (style?.icon) {
      const img = document.createElement('img')
      img.src = style.icon
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.position = 'relative'
      img.style.filter = 'drop-shadow(0 0 3px rgba(255,255,255,0.5))'
      el.appendChild(img)
    } else {
      const dot = document.createElement('div')
      dot.style.cssText = `
        width:100%;height:100%;border-radius:50%;position:relative;
        background:${color};border:2px solid rgba(255,255,255,0.8);
        box-shadow:0 0 6px ${color};
      `
      el.appendChild(dot)
    }

    let html = `<div style="font-size:14px;font-weight:bold;margin-bottom:6px;color:${color}">${point.name}</div>`
    html += `<div style="color:#8bb8f0;margin-bottom:4px">${style?.label ?? point.category} · ${point.country}</div>`
    const fields = activeLayer?.detailFields ?? []
    for (const f of fields) {
      const val = point.properties[f.key]
      if (val) {
        html += `<div style="margin-top:3px"><span style="color:#8899aa">${f.label}:</span> ${val}</div>`
      }
    }

    el.addEventListener('mouseenter', (e) => {
      markerHovered.current = true
      const tip = tooltipRef.current
      if (!tip) return
      tip.innerHTML = html
      tip.style.left = `${e.clientX + 12}px`
      tip.style.top = `${e.clientY - 12}px`
      tip.style.opacity = '1'
    })
    el.addEventListener('mousemove', (e) => {
      const tip = tooltipRef.current
      if (!tip) return
      tip.style.left = `${e.clientX + 12}px`
      tip.style.top = `${e.clientY - 12}px`
    })
    el.addEventListener('mouseleave', () => {
      markerHovered.current = false
      const tip = tooltipRef.current
      if (!tip) return
      tip.style.opacity = '0'
    })

    return el
  }, [activeLayer])

  const handleZoomIn = useCallback(() => {
    const globe = globeRef.current
    if (!globe) return
    const pov = globe.pointOfView()
    globe.pointOfView({ ...pov, altitude: Math.max(pov.altitude - 0.4, 0.5) }, 300)
  }, [])

  const handleZoomOut = useCallback(() => {
    const globe = globeRef.current
    if (!globe) return
    const pov = globe.pointOfView()
    globe.pointOfView({ ...pov, altitude: Math.min(pov.altitude + 0.4, 5) }, 300)
  }, [])

  const handleReset = useCallback(() => {
    const globe = globeRef.current
    if (!globe) return
    globe.pointOfView({ lat: 30, lng: 105, altitude: 2.2 }, 600)
  }, [])

  return (
    <div className="globe-container" ref={containerRef}>
      <div className="globe-controls">
        <button className="globe-ctrl-btn" onClick={handleZoomIn} title="放大">+</button>
        <button className="globe-ctrl-btn" onClick={handleZoomOut} title="缩小">-</button>
        <button className="globe-ctrl-btn globe-ctrl-reset" onClick={handleReset} title="复原">N</button>
      </div>
      <Globe
        ref={globeRef}
        width={containerSize.width || undefined}
        height={containerSize.height || undefined}
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere={true}
        atmosphereColor="#3a7bd5"
        atmosphereAltitude={0.2}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        onGlobeReady={handleGlobeReady}
        polygonsData={polygonsData}
        polygonGeoJsonGeometry={(d: object) => (d as CountryPolygon).geometry as any}
        polygonCapColor={(d: object) => {
          const p = d as CountryPolygon
          const hex = p.properties.color
          const opacity = Math.min(p.properties.opacity + 0.1, 0.85)
          const r = parseInt(hex.slice(1, 3), 16)
          const g = parseInt(hex.slice(3, 5), 16)
          const b = parseInt(hex.slice(5, 7), 16)
          return `rgba(${r},${g},${b},${opacity})`
        }}
        polygonSideColor={() => 'rgba(255,255,255,0.03)'}
        polygonStrokeColor={() => 'rgba(200,220,255,0.2)'}
        polygonAltitude={0.005}
        polygonLabel={() => ''}
        onPolygonHover={handlePolygonHover}
        onPolygonClick={handlePolygonClick}
        htmlElementsData={activeLayer ? filteredPoints : []}
        htmlLat={(d: object) => (d as DataPoint).coordinates[1]}
        htmlLng={(d: object) => (d as DataPoint).coordinates[0]}
        htmlAltitude={0.015}
        htmlElement={createMarkerEl}
      />
    </div>
  )
}
