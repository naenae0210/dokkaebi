import { useState, useEffect } from 'react'
import { supabase, CATEGORIES } from '../lib/supabase'
import type { Category, Place, Photo, PlaceType, Card, City } from '../lib/supabase'
import CitySearch from './CitySearch'
import PlaceSearch from './PlaceSearch'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const TYPE_COLOR: Record<PlaceType, string> = {
  Activity:   'bg-purple-100 text-purple-700 border-purple-200',
  Restaurant: 'bg-green-100 text-green-700 border-green-200',
  Cafe:       'bg-amber-100 text-amber-700 border-amber-200',
}

interface Props {
  editCard?: Card | null
  onClose: () => void
  onCreated: () => void
}

function SortablePlace({
  place, idx, total, onEdit, onTypeChange, onRemove
}: {
  place: Place
  idx: number
  total: number
  onEdit: () => void
  onTypeChange: (t: PlaceType) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: idx.toString() })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <span
        {...attributes}
        {...listeners}
        className="text-gray-300 cursor-grab active:cursor-grabbing text-base flex-shrink-0 select-none px-1"
      >
        ⠿
      </span>
      <div className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-gray-50 flex items-center justify-between">
        <span>{place.name}</span>
        <button onClick={onEdit} className="text-gray-300 hover:text-gray-500 text-xs ml-2">✎</button>
      </div>
      <select
        value={place.type}
        onChange={e => onTypeChange(e.target.value as PlaceType)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-gray-400 text-gray-700 bg-white flex-shrink-0"
      >
        <option value="Activity">Activity</option>
        <option value="Restaurant">Restaurant</option>
        <option value="Cafe">Cafe</option>
      </select>
      {total > 1 && (
        <button onClick={onRemove} className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0">✕</button>
      )}
    </div>
  )
}

export default function AddCardModal({ editCard, onClose, onCreated }: Props) {
  const isEdit = !!editCard

  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [cities, setCities] = useState<City[]>([])
  const [cityId, setCityId] = useState<string>(editCard?.city_id ?? '')
  const [citySearch, setCitySearch] = useState(editCard?.city?.name ?? '')
  const [showNewCity, setShowNewCity] = useState(false)
  const [category, setCategory] = useState<Category>(editCard?.category ?? 'Beach')
  const [title, setTitle] = useState(editCard?.title ?? '')
  const [places, setPlaces] = useState<Place[]>(
    editCard?.places?.length
      ? editCard.places
      : [{ name: '', type: 'Activity' }]
  )
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>(editCard?.photos ?? [])
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    supabase.from('cities').select('*').order('name').then(({ data }) => {
      if (data) setCities(data as City[])
      if (!data?.length) setShowNewCity(true)
    })
  }, [])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = parseInt(active.id as string)
    const newIdx = parseInt(over.id as string)
    setPlaces(prev => arrayMove(prev, oldIdx, newIdx))
  }

  function addPlace() {
    setPlaces(prev => [...prev, { name: '', type: 'Activity' }])
  }

  function removePlace(idx: number) {
    setPlaces(prev => prev.filter((_, i) => i !== idx))
  }

  async function removeExistingPhoto(photo: Photo) {
    await supabase.from('photos').delete().eq('id', photo.id)
    setExistingPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const validPlaces = places.filter(p => p.name.trim())
      const placesToSave = validPlaces.map(p => ({
        name: p.name,
        type: p.type,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
      }))

      if (isEdit && editCard) {
        await supabase
          .from('cards')
          .update({ category, title, city_id: cityId || null })
          .eq('id', editCard.id)

        await supabase.from('places').delete().eq('card_id', editCard.id)

        if (placesToSave.length > 0) {
          await supabase.from('places').insert(
            placesToSave.map(p => ({ ...p, card_id: editCard.id }))
          )
        }
      } else {
        const { data: card, error } = await supabase
          .from('cards')
          .insert({ category, title, city_id: cityId || null })
          .select()
          .single()
        if (error || !card) throw error

        if (placesToSave.length > 0) {
          await supabase.from('places').insert(
            placesToSave.map(p => ({ ...p, card_id: card.id }))
          )
        }
      }

      onCreated()
    } finally {
      setSaving(false)
    }
  }

  const selectedCity = cities.find(c => c.id === cityId)
  const canProceed = title.trim()

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">

        {/* 헤더 */}
        <div className="bg-[#1C1B18] px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-medium text-base">
            {step === 'form'
              ? isEdit ? 'Edit Card' : 'New Card'
              : isEdit ? 'Save changes?' : 'Create this card?'
            }
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-lg">✕</button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {step === 'form' ? (
            <div className="flex flex-col gap-5">

              {/* 도시 */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                  City
                </label>

                {cities.length > 0 && !showNewCity && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {cities.map(city => (
                      <button
                        key={city.id}
                        onClick={() => { setCityId(city.id); setCitySearch(city.name) }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          cityId === city.id
                            ? 'bg-[#1C1B18] text-white border-[#1C1B18]'
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        📍 {city.name}
                      </button>
                    ))}
                    <button
                      onClick={() => { setShowNewCity(true); setCitySearch('') }}
                      className="text-xs px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-all"
                    >
                      + Add city
                    </button>
                  </div>
                )}

                {(showNewCity || cities.length === 0) && (
                  <div>
                    <CitySearch
                      value={citySearch}
                      onChange={setCitySearch}
                      onSelect={city => {
                        setCityId(city.id)
                        setCitySearch(city.name)
                        setShowNewCity(false)
                        setCities(prev =>
                          prev.find(c => c.id === city.id) ? prev : [...prev, city]
                        )
                      }}
                      placeholder="Search city... (e.g. Tampa)"
                    />
                    {cities.length > 0 && (
                      <button
                        onClick={() => { setShowNewCity(false); setCitySearch('') }}
                        className="text-xs text-gray-400 hover:text-gray-600 mt-1.5 block"
                      >
                        ← Back
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 카테고리 */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        category === cat.id
                          ? 'bg-[#1C1B18] text-white border-[#1C1B18]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 제목 */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                  Title
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. The Dalí Museum + Gelato"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-gray-400 text-gray-900"
                />
              </div>

              {/* 장소 — 드래그 정렬 */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                  Places
                </label>
                <div className="flex flex-col gap-2">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={places.map((_, i) => i.toString())}
                      strategy={verticalListSortingStrategy}
                    >
                      {places.map((place, idx) => (
                        <div key={idx}>
                          {place.name ? (
                            <SortablePlace
                              place={place}
                              idx={idx}
                              total={places.length}
                              onEdit={() => setPlaces(prev =>
                                prev.map((p, i) => i === idx ? { ...p, name: '', lat: null, lng: null } : p)
                              )}
                              onTypeChange={t => setPlaces(prev =>
                                prev.map((p, i) => i === idx ? { ...p, type: t } : p)
                              )}
                              onRemove={() => removePlace(idx)}
                            />
                          ) : (
                            <PlaceSearch
                              type={place.type}
                              onTypeChange={t => setPlaces(prev =>
                                prev.map((p, i) => i === idx ? { ...p, type: t } : p)
                              )}
                              onSelect={result => setPlaces(prev =>
                                prev.map((p, i) => i === idx ? { ...p, ...result } : p)
                              )}
                              onRemove={() => removePlace(idx)}
                              showRemove={places.length > 1}
                            />
                          )}
                        </div>
                      ))}
                    </SortableContext>
                  </DndContext>

                  <button
                    onClick={addPlace}
                    className="text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-200 rounded-lg py-2 transition-colors"
                  >
                    + Add place
                  </button>
                </div>
              </div>

              {/* 수정 모드 - 기존 사진 */}
              {isEdit && existingPhotos.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                    Photos
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {existingPhotos.map(photo => (
                      <div key={photo.id} className="relative">
                        <img src={photo.url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                        <button
                          onClick={() => removeExistingPhoto(photo)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          ) : (
            <div className="flex flex-col gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                {selectedCity && (
                  <div className="text-xs text-gray-400 mb-1">📍 {selectedCity.name}</div>
                )}
                <div className="text-xs text-gray-400 mb-1">
                  {CATEGORIES.find(c => c.id === category)?.emoji} {category}
                </div>
                <div className="font-medium text-gray-900 mb-3">{title}</div>
                <div className="flex flex-col gap-1.5">
                  {places.filter(p => p.name.trim()).map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_COLOR[p.type]}`}>
                        {p.type}
                      </span>
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500 text-center">
                {isEdit ? 'Save these changes?' : 'Create this card?'}
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          {step === 'form' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!canProceed}
                className="flex-1 py-2.5 text-sm bg-[#1C1B18] text-white rounded-xl hover:bg-black transition-colors disabled:opacity-40"
              >
                Next
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('form')}
                className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 text-sm bg-[#C8773A] text-white rounded-xl hover:bg-[#b86a30] transition-colors disabled:opacity-40"
              >
                {saving ? 'Saving...' : isEdit ? '✓ Save' : '✓ Create'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}