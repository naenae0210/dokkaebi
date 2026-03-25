import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { City } from '../lib/supabase'

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (city: City) => void
  placeholder?: string
}

interface Prediction {
  place_id: string
  description: string
}

export default function CitySearch({ value, onChange, onSelect, placeholder }: Props) {
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

  // 외부 클릭 시 드롭다운 닫기
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
    onChange(val)
    if (!val.trim()) { setPredictions([]); setShowDropdown(false); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!autocompleteService.current) return
      autocompleteService.current.getPlacePredictions(
        { input: val, types: ['(cities)'] },
        (results: any[], status: string) => {
          if (status === 'OK' && results) {
            setPredictions(results.map(r => ({
              place_id: r.place_id,
              description: r.description,
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

  async function handleSelect(prediction: Prediction) {
    setShowDropdown(false)
    const cityName = prediction.description.split(',')[0].trim()
    onChange(cityName)

    // 좌표 가져오기
    placesService.current?.getDetails(
      { placeId: prediction.place_id, fields: ['geometry'] },
      async (place: any, status: string) => {
        const lat = status === 'OK' ? place?.geometry?.location?.lat() ?? null : null
        const lng = status === 'OK' ? place?.geometry?.location?.lng() ?? null : null

        // DB에서 같은 이름 도시 확인
        const { data: existing } = await supabase
          .from('cities')
          .select('*')
          .ilike('name', cityName)
          .maybeSingle()

        if (existing) {
          onSelect(existing as City)
        } else {
          const { data: newCity } = await supabase
            .from('cities')
            .insert({ name: cityName, lat, lng })
            .select()
            .single()
          if (newCity) onSelect(newCity as City)
        }
      }
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder ?? 'Search city...'}
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
              📍 {p.description}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}