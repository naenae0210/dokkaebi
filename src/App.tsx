import { useEffect, useState } from 'react'
import { supabase, CATEGORIES } from './lib/supabase'
import type { Card, Category, City } from './lib/supabase'
import PlanCard from './components/PlanCard'
import AddCardModal from './components/AddCardModal'
import MapView from './components/MapView'
import 'leaflet/dist/leaflet.css'

export default function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [catFilter, setCatFilter] = useState<Category | 'all'>('all')
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editCard, setEditCard] = useState<Card | null>(null)

async function loadData() {
  const { data: cardData } = await supabase
    .from('cards')
    .select('*, city:cities(*), places(*), photos(*)')
    .order('created_at', { ascending: false })
  if (cardData) setCards(cardData as Card[])

  const { data: cityData } = await supabase
    .from('cities')
    .select('*')
    .order('name')
  console.log('도시 목록:', cityData)  // 확인용
  if (cityData) setCities(cityData as City[])
}

  useEffect(() => { loadData() }, [])

  const filtered = cards
    .filter(c => cityFilter === 'all' || c.city_id === cityFilter)
    .filter(c => catFilter === 'all' || c.category === catFilter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#F5F0E8' }}>

      {/* 헤더 */}
      <header style={{ background: '#1C1B18', color: '#F5F0E8', padding: '20px 28px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, letterSpacing: '-0.02em', margin: 0 }}>
            Hang <em style={{ fontStyle: 'italic', color: '#C8A87A' }}>with</em>
          </h1>
          <span style={{ fontSize: 11, color: '#7A7568', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            your travel picks
          </span>
        </div>

        {/* 도시 필터 */}
        {cities.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            <FilterBtn
              label="All cities"
              active={cityFilter === 'all'}
              onClick={() => setCityFilter('all')}
            />
            {cities.map(city => (
              <FilterBtn
                key={city.id}
                label={`📍 ${city.name}`}
                active={cityFilter === city.id}
                onClick={() => setCityFilter(city.id)}
              />
            ))}
          </div>
        )}

        {/* 카테고리 필터 */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <FilterBtn
            label="All"
            active={catFilter === 'all'}
            onClick={() => setCatFilter('all')}
            dim
          />
          {CATEGORIES.map(cat => (
            <FilterBtn
              key={cat.id}
              label={`${cat.emoji} ${cat.label}`}
              active={catFilter === cat.id}
              onClick={() => setCatFilter(cat.id)}
              dim
            />
          ))}
        </div>
      </header>

      {/* 바디 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* 카드 패널 */}
        <div style={{ width: 400, flexShrink: 0, background: 'white', overflowY: 'auto', borderRight: '1px solid #F0EDE8' }}>

          {/* 새 카드 버튼 */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              width: '100%', padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: '1px solid #F0EDE8', background: 'none',
              cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF7')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <span style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#1C1B18', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, lineHeight: 1, flexShrink: 0
            }}>+</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1C1B18' }}>
              New card
            </span>
          </button>

          {/* 카드 목록 */}
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: '#B0ABA6' }}>
              <p style={{ fontSize: 13, margin: 0 }}>No cards yet</p>
              <p style={{ fontSize: 11, margin: '4px 0 0' }}>Add one above</p>
            </div>
          ) : (
            filtered.map(card => (
              <PlanCard
                key={card.id}
                card={card}
                active={activeCard?.id === card.id}
                onClick={() => setActiveCard(card)}
                onEdit={card => setEditCard(card)}
                onPhotoAdded={loadData}
              />
            ))
          )}
        </div>

        {/* 지도 */}
        <div style={{ flex: 1 }}>
          <MapView activeCard={activeCard} />
        </div>
      </div>

      {/* 모달 */}
      {(showModal || editCard) && (
        <AddCardModal
          editCard={editCard}
          onClose={() => { setShowModal(false); setEditCard(null) }}
          onCreated={() => { loadData(); setShowModal(false); setEditCard(null) }}
        />
      )}
    </div>
  )
}

// 필터 버튼 컴포넌트
function FilterBtn({
  label, active, onClick, dim = false
}: {
  label: string
  active: boolean
  onClick: () => void
  dim?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11, fontWeight: 500,
        padding: '4px 12px', borderRadius: 20,
        border: active
          ? `1px solid ${dim ? 'rgba(255,255,255,0.2)' : '#C8773A'}`
          : '1px solid rgba(255,255,255,0.18)',
        background: active
          ? dim ? 'rgba(255,255,255,0.15)' : '#C8773A'
          : 'transparent',
        color: active ? 'white' : '#A09888',
        cursor: 'pointer',
        transition: 'all 0.15s'
      }}
    >
      {label}
    </button>
  )
}