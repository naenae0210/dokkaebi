import { useEffect, useRef, useState } from 'react'
import type { PlaceType } from '../lib/types'
import { usePlacesAutocomplete } from '../hooks/usePlacesAutocomplete'
import type { Prediction } from '../hooks/usePlacesAutocomplete'

interface PlaceResult {
  name: string
  lat: number | null
  lng: number | null
}

interface Props {
  type: string
  placeTypes: PlaceType[]
  onTypeChange: (type: string) => void
  onSelect: (place: PlaceResult) => void
  onRemove?: () => void
  showRemove?: boolean
}

export default function PlaceSearch({ type, placeTypes, onTypeChange, onSelect, onRemove, showRemove }: Props) {
  const [value, setValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const { predictions, showDropdown, setShowDropdown, search, getDetails } = usePlacesAutocomplete(['establishment', 'geocode'])

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
    setValue(val)
    search(val, 5)
  }

  async function handleSelect(prediction: Prediction) {
    setShowDropdown(false)
    const name = prediction.structured_formatting?.main_text || prediction.description.split(',')[0].trim()
    setValue(name)
    const { lat, lng } = await getDetails(prediction.place_id)
    onSelect({ name, lat, lng })
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
                <div style={{ fontWeight: 500, fontSize: 13 }}>{p.structured_formatting?.main_text}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{p.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <select
        value={type}
        onChange={e => onTypeChange(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-gray-400 text-gray-700 bg-white flex-shrink-0"
      >
        {placeTypes.map(pt => (
          <option key={pt.id} value={pt.id}>{pt.label}</option>
        ))}
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
