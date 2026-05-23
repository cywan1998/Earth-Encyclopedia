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
  const [countries, setCountries] = useState<GeoJSON.Feature[]>([])
  const [countryNames, setCountryNames] = useState<Map<string, string>>(new Map())
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([])
  const [activeLayer, setActiveLayer] = useState<LayerConfig | null>(null)
  const initDone = useRef(false)

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
    const el = document.createElement('div')
    el.style.width = '24px'
    el.style.height = '24px'
    el.style.cursor = 'pointer'
    el.style.pointerEvents = 'auto'

    if (style?.icon) {
      const img = document.createElement('img')
      img.src = style.icon
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.filter = 'drop-shadow(0 0 3px rgba(255,255,255,0.5))'
      el.appendChild(img)
    } else {
      el.style.borderRadius = '50%'
      el.style.background = style?.color ?? '#95a5a6'
      el.style.border = '2px solid rgba(255,255,255,0.8)'
      el.style.boxShadow = `0 0 6px ${style?.color ?? '#95a5a6'}`
    }

    const color = style?.color ?? '#95a5a6'
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

  return (
    <div className="globe-container">
      <Globe
        ref={globeRef}
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
