import { useEffect, useRef, useState } from 'react'
import type { PlaceType } from '../lib/supabase'

interface PlaceResult {
  name: string
  lat: number | null
  lng: number | null
}

interface Props {
  type: PlaceType
  onTypeChange: (type: PlaceType) => void
  onSelect: (place: PlaceResult) => void
  onRemove?: () => void
  showRemove?: boolean
}

interface Prediction {
  place_id: string
  description: string
  structured_formatting: { main_text: string }
}

export default function PlaceSearch({ type, onTypeChange, onSelect, onRemove, showRemove }: Props) {
  const [value, setValue] = useState('')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const autocompleteService = useRef<any>(null)
  const placesService = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const google = (window as any).google
      if (!google?.maps?.places) return
      clearInterval(interval)
      autocompleteService.current = new google.maps.places.AutocompleteService()
      placesService.current = new google.maps.places.PlacesService(
        document.createElement('div')
      )
    }, 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInput(val: string) {
    setValue(val)
    if (!val.trim()) { setPredictions([]); setShowDropdown(false); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!autocompleteService.current) return
      autocompleteService.current.getPlacePredictions(
        { input: val, types: ['establishment', 'geocode'] },
        (results: any[], status: string) => {
          if (status === 'OK' && results) {
            setPredictions(results.slice(0, 5).map(r => ({
              place_id: r.place_id,
              description: r.description,
              structured_formatting: r.structured_formatting,
            })))
            setShowDropdown(true)
          } else {
            setPredictions([])
            setShowDropdown(false)
          }
        }
      )
    }, 300)
  }

  function handleSelect(prediction: Prediction) {
    setShowDropdown(false)
    const name = prediction.structured_formatting?.main_text || prediction.description.split(',')[0].trim()
    setValue(name)

    placesService.current?.getDetails(
      { placeId: prediction.place_id, fields: ['geometry', 'name'] },
      (place: any, status: string) => {
        const lat = status === 'OK' ? place?.geometry?.location?.lat() ?? null : null
        const lng = status === 'OK' ? place?.geometry?.location?.lng() ?? null : null
        onSelect({ name, lat, lng })
      }
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <input
          value={value}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder="Search place..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 text-gray-900"
          style={{ background: '#E5E7EB' }}
        />

        {showDropdown && predictions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'white', border: '1px solid #E5E7EB',
            borderRadius: 8, marginTop: 4,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            zIndex: 9999, overflow: 'hidden',
          }}>
            {predictions.map(p => (
              <button
                key={p.place_id}
                onMouseDown={e => { e.preventDefault(); handleSelect(p) }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 12px', fontSize: 13,
                  background: 'none', border: 'none',
                  borderBottom: '1px solid #F3F4F6',
                  cursor: 'pointer', color: '#1C1B18',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <div style={{ fontWeight: 500, fontSize: 13 }}>
                  {p.structured_formatting?.main_text}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                  {p.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <select
        value={type}
        onChange={e => onTypeChange(e.target.value as PlaceType)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-gray-400 text-gray-700 bg-white flex-shrink-0"
      >
        <option value="Activity">Activity</option>
        <option value="Restaurant">Restaurant</option>
        <option value="Cafe">Cafe</option>
      </select>

      {showRemove && (
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  )
}