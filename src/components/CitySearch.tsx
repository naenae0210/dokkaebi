import { useEffect, useRef } from 'react'
import type { City } from '../lib/types'
import { findOrCreateCity } from '../lib/api'
import { usePlacesAutocomplete } from '../hooks/usePlacesAutocomplete'
import type { Prediction } from '../hooks/usePlacesAutocomplete'

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (city: City) => void
  placeholder?: string
}

export default function CitySearch({ value, onChange, onSelect, placeholder }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { predictions, showDropdown, setShowDropdown, search, getDetails } = usePlacesAutocomplete(['(cities)'])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setShowDropdown])

  function handleInput(val: string) {
    onChange(val)
    search(val)
  }

  async function handleSelect(prediction: Prediction) {
    setShowDropdown(false)
    const cityName = prediction.description.split(',')[0].trim()
    onChange(cityName)
    const { lat, lng } = await getDetails(prediction.place_id, ['geometry'])
    const city = await findOrCreateCity(cityName, lat, lng)
    onSelect(city)
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
