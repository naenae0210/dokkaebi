import { useEffect, useState, useRef } from 'react'
import type { Card } from './lib/supabase'
import { useAuth } from './lib/auth'
import { useAppData } from './hooks/useAppData'
import PlanCard from './components/PlanCard'
import AddCardModal from './components/AddCardModal'
import MapView from './components/MapView'
import type { MapViewHandle } from './components/MapView'

type ViewMode = 'map' | 'list'

export default function App() {
  const { user, logout, deleteAccount } = useAuth()
  const { cards, cities, nicknames, categories, placeTypes, reload } = useAppData()
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const [nameIdx, setNameIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editCard, setEditCard] = useState<Card | null>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [cardScope, setCardScope] = useState<'mine' | 'all'>('mine')
  const mapViewRef = useRef<MapViewHandle>(null)

  const currentName = nicknames[nameIdx % Math.max(nicknames.length, 1)] ?? 'us'

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (nicknames.length <= 1) return
    const interval = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setNameIdx(i => (i + 1) % nicknames.length)
        setAnimating(false)
      }, 400)
    }, 1500)
    return () => clearInterval(interval)
  }, [nicknames.length])

  const filtered = cards
    .filter(c => cityFilter === 'all' || c.city_id === cityFilter)
    .filter(c => catFilter === 'all' || c.category === catFilter)

  const scopedCards = cardScope === 'mine' && user
    ? filtered.filter(c => c.user_id === user.id)
    : filtered

  // ── Map-view card list (sidebar / mobile bottom sheet) ───────────────────
  const cardList = (
    <>
      {user ? (
        <button
          onClick={() => setShowModal(true)}
          style={{
            width: '100%', padding: isMobile ? '12px 20px' : '16px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: '1px solid #F0F4FF',
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            background: 'none', cursor: 'pointer', textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <span style={{
            width: isMobile ? 24 : 28, height: isMobile ? 24 : 28,
            borderRadius: '50%', background: '#6366F1', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? 16 : 18, lineHeight: '1', flexShrink: 0,
          }}>+</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>New card</span>
        </button>
      ) : (
        <div style={{ padding: '14px 20px', fontSize: 12, color: '#94A3B8', borderBottom: '1px solid #F0F4FF' }}>
          <a href="/api/auth/google" style={{ color: '#6366F1', fontWeight: 500 }}>Sign in</a> to create cards
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: '#94A3B8' }}>
          <p style={{ fontSize: 13, margin: 0 }}>No cards yet</p>
          <p style={{ fontSize: 11, margin: '4px 0 0' }}>Add one above</p>
        </div>
      ) : (
        filtered.map(card => (
          <PlanCard
            key={card.id}
            card={card}
            categories={categories}
            placeTypes={placeTypes}
            active={activeCard?.id === card.id}
            onClick={() => setActiveCard(card)}
            onEdit={card => setEditCard(card)}
            onPhotoAdded={reload}
            onDeleted={reload}
            onPlaceClick={idx => mapViewRef.current?.focusMarker(idx)}
            currentUserId={user?.id}
          />
        ))
      )}
    </>
  )

  // ── List-tab view ─────────────────────────────────────────────────────────

  const listView = (
    <div style={{ padding: '0 0 40px' }}>
      {user ? (
        <button
          onClick={() => setShowModal(true)}
          style={{
            width: '100%', padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: '1px solid #F0F4FF',
            borderTop: 'none', borderLeft: 'none', borderRight: 'none',
            background: 'none', cursor: 'pointer', textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <span style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#6366F1', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, lineHeight: '1', flexShrink: 0,
          }}>+</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>New card</span>
        </button>
      ) : (
        <div style={{ padding: '14px 20px', fontSize: 12, color: '#94A3B8', borderBottom: '1px solid #F0F4FF' }}>
          <a href="/api/auth/google" style={{ color: '#6366F1', fontWeight: 500 }}>Sign in</a> to create cards
        </div>
      )}

      {user && (
        <div style={{ display: 'flex', gap: 6, padding: '12px 16px', borderBottom: '1px solid #F0F4FF' }}>
          {(['mine', 'all'] as const).map(scope => (
            <button
              key={scope}
              onClick={() => setCardScope(scope)}
              style={{
                fontSize: 11, fontWeight: 500,
                padding: '4px 12px', borderRadius: 20,
                border: cardScope === scope ? '1px solid #6366F1' : '1px solid #E2E8F0',
                background: cardScope === scope ? '#6366F1' : 'transparent',
                color: cardScope === scope ? 'white' : '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {scope === 'mine' ? 'My Cards' : 'All Cards'}
            </button>
          ))}
        </div>
      )}

      {scopedCards.length === 0 ? (
        <div style={{ padding: '24px 20px', fontSize: 12, color: '#94A3B8' }}>
          {cardScope === 'mine' ? "You haven't created any cards yet." : 'No cards found.'}
        </div>
      ) : (
        scopedCards.map(card => (
          <PlanCard
            key={card.id}
            card={card}
            categories={categories}
            placeTypes={placeTypes}
            active={false}
            onClick={() => {}}
            onEdit={card => setEditCard(card)}
            onPhotoAdded={reload}
            onDeleted={reload}
            currentUserId={user?.id}
          />
        ))
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#F8FAFC' }}>

      {/* Header */}
      <header style={{ background: '#0F172A', color: '#F1F5F9', padding: '16px 20px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: isMobile ? 22 : 27,
            letterSpacing: '-0.03em',
            margin: 0,
            display: 'flex', alignItems: 'baseline', gap: 8,
          }}>
            Hang <em style={{ fontStyle: 'italic', color: '#818CF8' }}>with</em>
            <span style={{ display: 'inline-block', overflow: 'hidden', height: '1.5em', verticalAlign: 'bottom', minWidth: 60 }}>
              <span style={{
                display: 'block',
                transition: animating ? 'transform 0.4s ease, opacity 0.4s ease' : 'none',
                transform: animating ? 'translateY(-100%)' : 'translateY(0)',
                opacity: animating ? 0 : 1,
                color: '#F1F5F9',
              }}>
                {currentName}
              </span>
            </span>
          </h1>

          {/* Auth area */}
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

                <button
                  onClick={logout}
                  style={{ fontSize: 11, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0 }}
                >
                  logout
                </button>

                <div
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setShowDeleteMenu(true)}
                  onMouseLeave={() => setShowDeleteMenu(false)}
                >
                  <button
                    style={{ fontSize: 13, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                  >
                    +
                  </button>
                  {showDeleteMenu && (
                    <button
                      onClick={async () => {
                        setShowDeleteMenu(false)
                        if (!window.confirm('Delete your account? Your cards will remain but your photos will be removed.')) return
                        try {
                          await deleteAccount()
                        } catch {
                          alert('Failed to delete account. Please try again.')
                        }
                      }}
                      style={{
                        position: 'absolute', top: '100%', right: 0,
                        marginTop: 4, whiteSpace: 'nowrap',
                        fontSize: 11, color: '#EF4444',
                        background: '#1E293B', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 6, padding: '4px 10px',
                        cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                        zIndex: 200,
                      }}
                    >
                      delete my account
                    </button>
                  )}
                </div>
              </>
            ) : (
              <a
                href="/api/auth/google"
                style={{ fontSize: 11, color: '#818CF8', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                sign in
              </a>
            )}
          </div>
        </div>

        {/* City filter */}
        <div style={{ position: 'relative', marginTop: 12 }}>
          <button
            onClick={() => cities.length > 0 && setShowCityDropdown(prev => !prev)}
            style={{
              fontSize: 11, fontWeight: 500,
              padding: '4px 12px', borderRadius: 20,
              border: cityFilter !== 'all'
                ? '1px solid #6366F1'
                : '1px solid rgba(255,255,255,0.18)',
              background: cityFilter !== 'all' ? '#6366F1' : 'transparent',
              color: cityFilter !== 'all' ? 'white' : '#64748B',
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
                background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                minWidth: 160,
              }}>
                <button
                  onClick={() => { setCityFilter('all'); setShowCityDropdown(false) }}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 14px', fontSize: 12,
                    background: cityFilter === 'all' ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: cityFilter === 'all' ? '#818CF8' : '#64748B',
                    border: 'none', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = cityFilter === 'all' ? 'rgba(99,102,241,0.2)' : 'transparent')}
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
                      background: cityFilter === city.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                      color: cityFilter === city.id ? '#818CF8' : '#64748B',
                      border: 'none', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = cityFilter === city.id ? 'rgba(99,102,241,0.2)' : 'transparent')}
                  >
                    📍 {city.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <FilterBtn label="Mood" active={catFilter === 'all'} onClick={() => setCatFilter('all')} dim />
          {categories.map(cat => (
            <FilterBtn key={cat.id} label={`${cat.emoji} ${cat.label}`} active={catFilter === cat.id} onClick={() => setCatFilter(cat.id)} dim />
          ))}
        </div>
      </header>

      {/* Tab bar */}
      <div style={{ display: 'flex', flexShrink: 0, background: '#F8FAFC' }}>
        <button
          onClick={() => setViewMode('map')}
          style={{
            flex: 1, padding: '10px 0',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
            background: viewMode === 'map' ? 'white' : 'transparent',
            color: viewMode === 'map' ? '#0F172A' : '#94A3B8',
            border: 'none',
            borderBottom: viewMode === 'map' ? '2px solid #6366F1' : '2px solid transparent',
            borderRight: '1px solid #E2E8F0',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          🗺 Map
        </button>
        <button
          onClick={() => setViewMode('list')}
          style={{
            flex: 1, padding: '10px 0',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
            background: viewMode === 'list' ? 'white' : 'transparent',
            color: viewMode === 'list' ? '#0F172A' : '#94A3B8',
            border: 'none',
            borderBottom: viewMode === 'list' ? '2px solid #6366F1' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          ☰ List
        </button>
      </div>

      {/* Body */}
      {viewMode === 'list' ? (
        <div style={{ flex: 1, overflowY: 'auto', background: 'white' }}>
          {listView}
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: '0 0 40%', position: 'relative', minHeight: 0 }}>
            <MapView ref={mapViewRef} activeCard={activeCard} />
          </div>
          <div style={{ flex: '0 0 60%', background: 'white', overflowY: 'auto', borderTop: '1px solid #E2E8F0' }}>
            <div style={{
              display: 'flex', justifyContent: 'center',
              padding: '8px 0 4px',
              position: 'sticky', top: 0,
              background: 'white', zIndex: 10,
              borderBottom: '1px solid #E2E8F0',
            }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1' }} />
            </div>
            {cardList}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ width: 400, flexShrink: 0, background: 'white', overflowY: 'auto', borderRight: '1px solid #E2E8F0' }}>
            {cardList}
          </div>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <MapView ref={mapViewRef} activeCard={activeCard} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        flexShrink: 0,
        background: '#0F172A',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12,
      }}>
        <span style={{ fontSize: 11, color: '#8d9fb8' }}>© 2026 hangwithus</span>
        <a
          href="mailto:naegyeong0210@gmail.com"
          style={{ fontSize: 11, color: '#8d9fb8', textDecoration: 'none' }}
        >
          naegyeong0210@gmail.com
        </a>
      </footer>

      {/* Modal */}
      {(showModal || editCard) && (
        <AddCardModal
          editCard={editCard}
          categories={categories}
          placeTypes={placeTypes}
          onClose={() => { setShowModal(false); setEditCard(null) }}
          onCreated={() => { reload(); setShowModal(false); setEditCard(null) }}
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
          ? `1px solid ${dim ? 'rgba(255,255,255,0.25)' : '#6366F1'}`
          : '1px solid rgba(255,255,255,0.18)',
        background: active
          ? dim ? 'rgba(255,255,255,0.15)' : '#6366F1'
          : 'transparent',
        color: active ? 'white' : '#64748B',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}
