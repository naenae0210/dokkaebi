import { useEffect, useState, useRef } from 'react'
import { supabase, CATEGORIES } from './lib/supabase'
import type { Card, Category, City, Name } from './lib/supabase'
import PlanCard from './components/PlanCard'
import AddCardModal from './components/AddCardModal'
import MapView from './components/MapView'

export default function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [names, setNames] = useState<Name[]>([])
  const [nameIdx, setNameIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [newName, setNewName] = useState('')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [catFilter, setCatFilter] = useState<Category | 'all'>('all')
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editCard, setEditCard] = useState<Card | null>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const inputRef = useRef<HTMLInputElement>(null)

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
    if (cityData) setCities(cityData as City[])

    const { data: nameData } = await supabase
      .from('names')
      .select('*')
      .order('created_at')
    if (nameData) setNames(nameData as Name[])
  }

  useEffect(() => { loadData() }, [])

  // 반응형 감지
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 이름 슬라이드 — 1.5초마다
  useEffect(() => {
    if (names.length <= 1) return
    const interval = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setNameIdx(i => (i + 1) % names.length)
        setAnimating(false)
      }, 400)
    }, 1500)
    return () => clearInterval(interval)
  }, [names])

  // 입력창 열리면 포커스
  useEffect(() => {
    if (showNameInput) inputRef.current?.focus()
  }, [showNameInput])

  async function addName() {
    if (!newName.trim()) return
    const { data } = await supabase
      .from('names')
      .insert({ name: newName.trim() })
      .select()
      .single()
    if (data) setNames(prev => [...prev, data as Name])
    setNewName('')
    setShowNameInput(false)
  }

  const filtered = cards
    .filter(c => cityFilter === 'all' || c.city_id === cityFilter)
    .filter(c => catFilter === 'all' || c.category === catFilter)

  const currentName = names[nameIdx]?.name ?? 'nae'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#F5F0E8' }}>

      {/* 헤더 */}
      <header style={{ background: '#1C1B18', color: '#F5F0E8', padding: '16px 20px 12px', flexShrink: 0 }}>

        {/* 타이틀 행 */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? 22 : 26, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            Hang <em style={{ fontStyle: 'italic', color: '#C8A87A' }}>with</em>
            <span style={{ display: 'inline-block', overflow: 'hidden', height: '1.5em', verticalAlign: 'bottom', minWidth: 60 }}>
              <span style={{
                display: 'block',
                transition: animating ? 'transform 0.4s ease, opacity 0.4s ease' : 'none',
                transform: animating ? 'translateY(-100%)' : 'translateY(0)',
                opacity: animating ? 0 : 1,
                color: '#F5F0E8',
              }}>
                {currentName}
              </span>
            </span>
          </h1>

          {!showNameInput ? (
            <button
              onClick={() => setShowNameInput(true)}
              style={{ fontSize: 11, color: '#7A7568', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0 }}
            >
              add your name
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                ref={inputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addName()
                  if (e.key === 'Escape') { setShowNameInput(false); setNewName('') }
                }}
                placeholder="name"
                style={{
                  fontSize: 13, background: 'transparent',
                  border: 'none', borderBottom: '1px solid #7A7568',
                  color: '#F5F0E8', outline: 'none',
                  width: 80, padding: '2px 4px',
                  fontFamily: 'Georgia, serif', fontStyle: 'italic',
                }}
              />
              <button onClick={addName} style={{ fontSize: 11, color: '#C8A87A', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>✓</button>
              <button onClick={() => { setShowNameInput(false); setNewName('') }} style={{ fontSize: 11, color: '#7A7568', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
          )}
        </div>

        {/* 도시 필터 */}
        {cities.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            <FilterBtn label="All City" active={cityFilter === 'all'} onClick={() => setCityFilter('all')} />
            {cities.map(city => (
              <FilterBtn key={city.id} label={`📍 ${city.name}`} active={cityFilter === city.id} onClick={() => setCityFilter(city.id)} />
            ))}
          </div>
        )}

        {/* 카테고리 필터 */}
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <FilterBtn label="All Mood" active={catFilter === 'all'} onClick={() => setCatFilter('all')} dim />
          {CATEGORIES.map(cat => (
            <FilterBtn key={cat.id} label={`${cat.emoji} ${cat.label}`} active={catFilter === cat.id} onClick={() => setCatFilter(cat.id)} dim />
          ))}
        </div>
      </header>

{/* 바디 */}
<div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>

  {/* 카드 패널 */}
  <div style={{
    width: isMobile ? '100%' : 400,
    flexShrink: 0,
    background: 'white',
    overflowY: 'auto',
    borderRight: isMobile ? 'none' : '1px solid #F0EDE8',
    // 모바일에서 카드 선택되면 높이 줄어듦
    height: isMobile ? (activeCard ? '40%' : '100%') : '100%',
    transition: 'height 0.3s ease',
  }}>
    <button
      onClick={() => setShowModal(true)}
      style={{
        width: '100%', padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid #F0EDE8',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        background: 'none', cursor: 'pointer', textAlign: 'left',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF7')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <span style={{
        width: 28, height: 28, borderRadius: '50%',
        background: '#1C1B18', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, lineHeight: '1', flexShrink: 0
      }}>+</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#1C1B18' }}>New card</span>
    </button>

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

  {/* 지도 — 데스크탑: 항상 / 모바일: 카드 선택 시만 */}
  {(!isMobile || activeCard) && (
    <div style={{
      flex: 1,
      position: 'relative',
      minHeight: 0,
      // 모바일에서 카드 선택되면 아래 60% 차지
      height: isMobile ? '60%' : '100%',
      borderTop: isMobile ? '1px solid #F0EDE8' : 'none',
    }}>
      {/* 모바일 닫기 버튼 */}
      {isMobile && activeCard && (
        <button
          onClick={() => setActiveCard(null)}
          style={{
            position: 'absolute', top: 12, left: 12,
            zIndex: 1000, background: 'white',
            border: 'none', borderRadius: 20,
            padding: '6px 12px', fontSize: 12,
            cursor: 'pointer', fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          ✕ 지도 닫기
        </button>
      )}
      <MapView activeCard={activeCard} />
    </div>
  )}
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