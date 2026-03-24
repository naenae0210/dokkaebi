import { useEffect, useRef, useState } from 'react'
import type { Card } from '../lib/supabase'

interface Props {
  activeCard: Card | null
}

async function geocode(name: string, cityName?: string): Promise<{ lat: number; lng: number } | null> {
  const query = cityName ? `${name}, ${cityName}` : name
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY

  console.log('🔍 geocode 요청:', query)

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`
    )
    const data = await res.json()
    console.log('📍 결과:', data.results?.[0]?.formatted_address ?? '없음')

    if (data.results?.length > 0) {
      const { lat, lng } = data.results[0].geometry.location
      return { lat, lng }
    }
    return null
  } catch (e) {
    console.error('❌ geocode 에러:', e)
    return null
  }
}

export default function MapView({ activeCard }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const LRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)

  // 지도 초기화 — 마운트 시 1번만
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    import('leaflet').then(L => {
      LRef.current = L

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!).setView([27.9506, -82.4572], 11)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map)

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // 카드 바뀔 때마다 마커 업데이트
  useEffect(() => {
    if (!activeCard?.places?.length) {
      if (mapRef.current && LRef.current) {
        markersRef.current.forEach(m => mapRef.current.removeLayer(m))
        markersRef.current = []
      }
      return
    }

    async function plotMarkers() {
      if (!mapRef.current || !LRef.current) return
      const map = mapRef.current
      const L = LRef.current

      // 기존 마커 제거
      markersRef.current.forEach(m => map.removeLayer(m))
      markersRef.current = []

      setLoading(true)

      const bounds: [number, number][] = []
      const cityName = activeCard!.city?.name

      for (let i = 0; i < activeCard!.places!.length; i++) {
        const place = activeCard!.places![i]

        // 도시명 포함해서 검색 → 정확도 향상
        const coords = await geocode(place.name, cityName)
        if (!coords) continue

        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + (cityName ? `, ${cityName}` : ''))}`

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            background:#C8773A;color:white;border-radius:50%;
            width:28px;height:28px;display:flex;align-items:center;
            justify-content:center;font-size:11px;font-weight:700;
            border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);
            font-family:sans-serif;cursor:pointer;
          ">${i + 1}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })

        const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map)

        marker.bindPopup(`
          <div style="font-family:sans-serif;min-width:140px;">
            <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${place.name}</div>
            <div style="font-size:11px;color:#888;margin-bottom:8px;">${place.type}</div>
            <button
              onclick="window.open('${googleMapsUrl}', '_blank')"
              style="font-size:11px;color:#C8773A;background:none;border:none;padding:0;cursor:pointer;font-weight:500;"
            >↗ Open in Google Maps</button>
          </div>
        `)

        markersRef.current.push(marker)
        bounds.push([coords.lat, coords.lng])
      }

      setLoading(false)

      if (bounds.length > 1) map.fitBounds(bounds, { padding: [60, 60] })
      else if (bounds.length === 1) map.setView(bounds[0], 14)
    }

    plotMarkers()
  }, [activeCard])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
      />
      {loading && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'white', borderRadius: 20, padding: '6px 14px',
          fontSize: 12, color: '#666', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000, fontFamily: 'sans-serif'
        }}>
          📍 Finding places...
        </div>
      )}
    </div>
  )
}