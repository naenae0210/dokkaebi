import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import type { Card } from '../lib/supabase'

export interface MapViewHandle {
  focusMarker: (idx: number) => void
}

async function geocode(name: string, cityName?: string): Promise<{ lat: number; lng: number } | null> {
  const query = cityName ? `${name}, ${cityName}` : name
  try {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const MapView = forwardRef<MapViewHandle, { activeCard: Card | null }>(({ activeCard }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infoWindowsRef = useRef<any[]>([])
  const [loading, setLoading] = useState(false)

  // 외부에서 호출 가능
  useImperativeHandle(ref, () => ({
    focusMarker(idx: number) {
      if (!mapRef.current || !markersRef.current[idx]) return
      infoWindowsRef.current.forEach(iw => iw.close())
      const marker = markersRef.current[idx]
      mapRef.current.panTo(marker.getPosition())
      mapRef.current.setZoom(16)
      infoWindowsRef.current[idx]?.open(mapRef.current, marker)
    }
  }))

  // 지도 초기화
  useEffect(() => {
    const interval = setInterval(() => {
      const google = (window as any).google
      if (!google?.maps || mapRef.current) return
      clearInterval(interval)

      mapRef.current = new google.maps.Map(containerRef.current!, {
        center: { lat: 27.9506, lng: -82.4572 },
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ]
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  // 카드 바뀔 때 마커 업데이트
  useEffect(() => {
    if (!mapRef.current) return

    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    infoWindowsRef.current = []

    if (!activeCard?.places?.length) return

    async function plotMarkers() {
      setLoading(true)
      try {
        const google = (window as any).google
        const bounds = new google.maps.LatLngBounds()
        const cityName = activeCard!.city?.name

        for (let i = 0; i < activeCard!.places!.length; i++) {
          const place = activeCard!.places![i]

          let coords: { lat: number; lng: number } | null = null
          if (place.lat && place.lng) {
            coords = { lat: place.lat, lng: place.lng }
          } else {
            coords = await geocode(place.name, cityName)
          }
          if (!coords) continue

          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + (cityName ? `, ${cityName}` : ''))}`

          const marker = new google.maps.Marker({
            position: coords,
            map: mapRef.current,
            label: {
              text: String(i + 1),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 16,
              fillColor: '#C8773A',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2,
            }
          })

          const container = document.createElement('div')
          container.style.cssText = 'font-family:sans-serif;min-width:150px;padding:4px;'

          const nameEl = document.createElement('div')
          nameEl.style.cssText = 'font-size:13px;font-weight:600;margin-bottom:4px;'
          nameEl.textContent = place.name

          const typeEl = document.createElement('div')
          typeEl.style.cssText = 'font-size:11px;color:#888;margin-bottom:8px;'
          typeEl.textContent = place.type

          const btn = document.createElement('button')
          btn.style.cssText = 'font-size:11px;color:#C8773A;background:none;border:none;padding:0;cursor:pointer;font-weight:500;'
          btn.textContent = '↗ Open in Google Maps'
          btn.addEventListener('click', () => window.open(googleMapsUrl, '_blank'))

          container.appendChild(nameEl)
          container.appendChild(typeEl)
          container.appendChild(btn)

          const infoWindow = new google.maps.InfoWindow({ content: container })

          marker.addListener('click', () => {
            infoWindowsRef.current.forEach(iw => iw.close())
            infoWindow.open(mapRef.current, marker)
          })

          markersRef.current.push(marker)
          infoWindowsRef.current.push(infoWindow)
          bounds.extend(coords)
        }

        if (markersRef.current.length > 1) {
          mapRef.current!.fitBounds(bounds, { padding: 60 })
        } else if (markersRef.current.length === 1) {
          mapRef.current!.setCenter(bounds.getCenter())
          mapRef.current!.setZoom(14)
        }
      } catch (e) {
        console.error('Failed to plot markers:', e)
      } finally {
        setLoading(false)
      }
    }

    plotMarkers()
  }, [activeCard])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {loading && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'white', borderRadius: 20, padding: '6px 14px',
          fontSize: 12, color: '#666', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000, fontFamily: 'sans-serif', whiteSpace: 'nowrap'
        }}>
          📍 Finding places...
        </div>
      )}
    </div>
  )
})

export default MapView