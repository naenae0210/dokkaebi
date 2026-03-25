import { useEffect, useRef } from 'react'
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
  placeholder?: string
}

export default function PlaceSearch({
  type,
  onTypeChange,
  onSelect,
  onRemove,
  showRemove = false,
   placeholder: _placeholder = 'Search place...'
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const google = (window as any).google
      if (!google?.maps?.places?.PlaceAutocompleteElement) return
      clearInterval(interval)

      const autocomplete = new google.maps.places.PlaceAutocompleteElement()
      autocomplete.style.cssText = `width: 100%; font-family: inherit; font-size: 14px;`
      containerRef.current?.appendChild(autocomplete)

      autocomplete.addEventListener('gmp-select', async (e: any) => {
        console.log('🎯 gmp-select 이벤트:', e)
        try {
          const place = await e.placePrediction.toPlace()
          await place.fetchFields({ fields: ['displayName', 'location'] })

          console.log('📍 장소:', place.displayName, place.location?.lat(), place.location?.lng())

          onSelect({
            name: place.displayName ?? '',
            lat: place.location?.lat() ?? null,
            lng: place.location?.lng() ?? null,
          })
        } catch (err) {
          console.error('❌ PlaceSearch 에러:', err)
        }
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Google Places 검색창 */}
      <div ref={containerRef} style={{ flex: 1 }} />

      {/* 타입 선택 */}
      <select
        value={type}
        onChange={e => onTypeChange(e.target.value as PlaceType)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-gray-400 text-gray-700 bg-white flex-shrink-0"
      >
        <option value="Activity">Activity</option>
        <option value="Restaurant">Restaurant</option>
        <option value="Cafe">Cafe</option>
      </select>

      {/* 삭제 버튼 */}
      {showRemove && (
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 text-sm transition-colors flex-shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  )
}