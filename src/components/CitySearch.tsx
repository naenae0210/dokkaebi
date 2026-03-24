import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { City } from '../lib/supabase'

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (city: City) => void
  placeholder?: string
}

export default function CitySearch({ value, onChange, onSelect, placeholder }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(async () => {
      const google = (window as any).google
      if (!google?.maps?.places?.PlaceAutocompleteElement) return
      clearInterval(interval)

      console.log('✅ PlaceAutocompleteElement 준비됨')

      const autocomplete = new google.maps.places.PlaceAutocompleteElement({
        types: ['(cities)'],
      })

      // 스타일 적용
      autocomplete.style.cssText = `
        width: 100%;
        font-size: 14px;
        font-family: inherit;
      `

      containerRef.current?.appendChild(autocomplete)

      // 가능한 모든 이벤트 리스닝 (어떤 게 발생하는지 확인)
      const events = ['gmp-placeselect', 'place_changed', 'gmp-select', 'placeselect']
      events.forEach(eventName => {
        autocomplete.addEventListener(eventName, (e: any) => {
          console.log(`🎯 이벤트 발생: ${eventName}`, e)
        })
      })

    autocomplete.addEventListener('gmp-select', async (e: any) => {
    console.log('🎯 gmp-select:', e)

    const place = e.placePrediction?.toPlace?.()
    if (!place) {
        console.log('❌ place 없음')
        return
    }

    try {
        await place.fetchFields({ fields: ['displayName', 'location'] })

        const cityName = place.displayName ?? ''
        const lat = place.location?.lat() ?? null
        const lng = place.location?.lng() ?? null

        if (!cityName) return

        onChange(cityName)

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
    } catch (err) {
        console.error('❌ 에러:', err)
    }
    })

    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%' }}
    />
  )
}