import { useEffect, useState, useRef } from 'react'
import { CATEGORIES } from './lib/supabase'
import type { Card, Category, City, Name } from './lib/supabase'
import * as api from './lib/api'
import { useAuth } from './lib/auth'
import PlanCard from './components/PlanCard'
import AddCardModal from './components/AddCardModal'
import MapView from './components/MapView'
import type { MapViewHandle } from './components/MapView'

type ViewMode = 'map' | 'list'

export default function App() {
  const { user, logout } = useAuth()
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
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const inputRef = useRef<HTMLInputElement>(null)
  const mapViewRef = useRef<MapViewHandle>(null)

  // 로그인한 유저 닉네임을 names 로테이션에 포함 (effects보다 먼저 계산)
  const rotatingNames = user
    ? [{ id: 'me', name: user.nickname }, ...names]
    : names
  const currentName = rotatingNames[nameIdx % Math.max(rotatingNames.length, 1)]?.name ?? 'nae'

  async function loadData() {
    const [cardRes, cityRes, nameRes] = await Promise.allSettled([
      api.getCards(),
      api.getCities(),
      api.getNames(),
    ])
    if (cardRes.status === 'fulfilled') setCards(cardRes.value)
    if (cityRes.status === 'fulfilled') setCities(cityRes.value)
    if (nameRes.status === 'fulfilled') setNames(nameRes.value)
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (rotatingNames.length <= 1) return
    const interval = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setNameIdx(i => (i + 1) % rotatingNames.length)
        setAnimating(false)
      }, 400)
    }, 1500)
    return () => clearInterval(interval)
  }, [rotatingNames.length])

  useEffect(() => {
    if (showNameInput) inputRef.current?.focus()
  }, [showNameInput])

  async function addName() {
    if (!newName.trim()) return
    const data = await api.createName(newName.trim())
    setNames(prev => [...prev, data])
    setNewName('')
    setShowNameInput(false)
  }

  const filtered = cards
    .filter(c => cityFilter === 'all' || c.city_id === cityFilter)
    .filter(c => catFilter === 'all' || c.category === catFilter)

  const myCards = user ? filtered.filter(c => c.user_id === user.id) : []
  const allCards = filtered

  // 카드 목록 JSX — 모바일/데스크탑 공통
  const cardList = (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          width: '100%', padding: isMobile ? '12px 20px' : '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid #F0EDE8',
          borderTop: 'none', borderLeft: 'none', borderRight: 'none',
          background: 'none', cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF7')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <span style={{
          width: isMobile ? 24 : 28, height: isMobile ? 24 : 28,
          borderRadius: '50%', background: '#1C1B18', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isMobile ? 16 : 18, lineHeight: '1', flexShrink: 0
        }}>+</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#1C1B18' }}>New card</span>
      </button>

      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#B0ABA6' }}>
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
            onPlaceClick={idx => mapViewRef.current?.focusMarker(idx)}
          />
        ))
      )}
    </>
  )

  // 리스트 탭 JSX
  const listView = (
    <div style={{ padding: '0 0 40px' }}>
      {/* New card 버튼 */}
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
          fontSize: 18, lineHeight: '1', flexShrink: 0,
        }}>+</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#1C1B18' }}>New card</span>
      </button>

      {/* My Cards — 로그인한 경우만 */}
      {user && (
        <>
          <div style={{ padding: '16px 20px 8px', fontSize: 11, fontWeight: 600, color: '#7A7568', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            My Cards
          </div>
          {myCards.length === 0 ? (
            <div style={{ padding: '12px 20px 20px', fontSize: 12, color: '#B0ABA6' }}>
              You haven't created any cards yet.
            </div>
          ) : (
            myCards.map(card => (
              <PlanCard
                key={card.id}
                card={card}
                active={false}
                onClick={() => {}}
                onEdit={card => setEditCard(card)}
                onPhotoAdded={loadData}
              />
            ))
          )}
        </>
      )}

      {/* All Cards */}
      <div style={{ padding: '16px 20px 8px', fontSize: 11, fontWeight: 600, color: '#7A7568', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        All Cards
      </div>
      {allCards.length === 0 ? (
        <div style={{ padding: '12px 20px', fontSize: 12, color: '#B0ABA6' }}>
          No cards found.
        </div>
      ) : (
        allCards.map(card => (
          <PlanCard
            key={card.id}
            card={card}
            active={false}
            onClick={() => {}}
            onEdit={card => setEditCard(card)}
            onPhotoAdded={loadData}
          />
        ))
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#F5F0E8' }}>

      {/* 헤더 */}
      <header style={{ background: '#1C1B18', color: '#F5F0E8', padding: '16px 20px 12px', flexShrink: 0 }}>
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

          {/* 로그인/유저 영역 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user ? (
              <>
                {user.avatar_url && (
                  <img
                    src={user.avatar_url}
                    alt={user.nickname}
                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <span style={{ fontSize: 11, color: '#A09888' }}>{user.nickname}</span>
                <button
                  onClick={logout}
                  style={{ fontSize: 11, color: '#7A7568', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0 }}
                >
                  logout
                </button>
              </>
            ) : !showNameInput ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <a
                  href="/api/auth/google"
                  style={{ fontSize: 11, color: '#C8A87A', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  sign in
                </a>
                <button
                  onClick={() => setShowNameInput(true)}
                  style={{ fontSize: 11, color: '#7A7568', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0 }}
                >
                  add your name
                </button>
              </div>
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
        </div>

        {/* 도시 필터 */}
        {cities.length > 0 && (
          <div style={{ position: 'relative', marginTop: 12 }}>
            <button
              onClick={() => setShowCityDropdown(prev => !prev)}
              style={{
                fontSize: 11, fontWeight: 500,
                padding: '4px 12px', borderRadius: 20,
                border: cityFilter !== 'all'
                  ? '1px solid #C8773A'
                  : '1px solid rgba(255,255,255,0.18)',
                background: cityFilter !== 'all' ? '#C8773A' : 'transparent',
                color: cityFilter !== 'all' ? 'white' : '#A09888',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              📍 {cityFilter === 'all' ? 'Everywhere' : cities.find(c => c.id === cityFilter)?.name ?? 'Everywhere'}
              <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
            </button>

            {showCityDropdown && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                  onClick={() => setShowCityDropdown(false)}
                />
                <div style={{
                  position: 'absolute', top: '100%', left: 0,
                  marginTop: 6, zIndex: 100,
                  background: '#2A2926', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  minWidth: 160,
                }}>
                  <button
                    onClick={() => { setCityFilter('all'); setShowCityDropdown(false) }}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '10px 14px', fontSize: 12,
                      background: cityFilter === 'all' ? 'rgba(200,119,58,0.2)' : 'transparent',
                      color: cityFilter === 'all' ? '#C8A87A' : '#A09888',
                      border: 'none', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = cityFilter === 'all' ? 'rgba(200,119,58,0.2)' : 'transparent')}
                  >
                    All City
                  </button>
                  {cities.map(city => (
                    <button
                      key={city.id}
                      onClick={() => { setCityFilter(city.id); setShowCityDropdown(false) }}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '10px 14px', fontSize: 12,
                        background: cityFilter === city.id ? 'rgba(200,119,58,0.2)' : 'transparent',
                        color: cityFilter === city.id ? '#C8A87A' : '#A09888',
                        border: 'none', cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = cityFilter === city.id ? 'rgba(200,119,58,0.2)' : 'transparent')}
                    >
                      📍 {city.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 카테고리 필터 */}
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <FilterBtn label="Mood" active={catFilter === 'all'} onClick={() => setCatFilter('all')} dim />
          {CATEGORIES.map(cat => (
            <FilterBtn key={cat.id} label={`${cat.emoji} ${cat.label}`} active={catFilter === cat.id} onClick={() => setCatFilter(cat.id)} dim />
          ))}
        </div>

        {/* Map / List 탭 */}
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          <TabBtn label="🗺 Map" active={viewMode === 'map'} onClick={() => setViewMode('map')} />
          <TabBtn label="☰ List" active={viewMode === 'list'} onClick={() => setViewMode('list')} />
        </div>
      </header>

      {/* 바디 */}
      {viewMode === 'list' ? (
        // ── 리스트 탭 ──
        <div style={{ flex: 1, overflowY: 'auto', background: 'white' }}>
          {listView}
        </div>
      ) : isMobile ? (
        // ── 모바일 지도 탭 ──
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: '0 0 40%', position: 'relative', minHeight: 0 }}>
            <MapView ref={mapViewRef} activeCard={activeCard} />
          </div>
          <div style={{ flex: '0 0 60%', background: 'white', overflowY: 'auto', borderTop: '1px solid #F0EDE8' }}>
            <div style={{
              display: 'flex', justifyContent: 'center',
              padding: '8px 0 4px',
              position: 'sticky', top: 0,
              background: 'white', zIndex: 10,
              borderBottom: '1px solid #F0EDE8',
            }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DDD8' }} />
            </div>
            {cardList}
          </div>
        </div>
      ) : (
        // ── 데스크탑 지도 탭 ──
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ width: 400, flexShrink: 0, background: 'white', overflowY: 'auto', borderRight: '1px solid #F0EDE8' }}>
            {cardList}
          </div>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <MapView ref={mapViewRef} activeCard={activeCard} />
          </div>
        </div>
      )}

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

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11, fontWeight: 500,
        padding: '4px 14px', borderRadius: 20,
        border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        color: active ? 'white' : '#7A7568',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}
