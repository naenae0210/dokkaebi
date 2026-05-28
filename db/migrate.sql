-- Run this against an existing database to apply schema changes.
-- Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS checks).

CREATE TABLE IF NOT EXISTS categories (
    id         text    NOT NULL,
    label      text    NOT NULL,
    emoji      text    NOT NULL DEFAULT '',
    sort_order integer NOT NULL DEFAULT 0,
    CONSTRAINT categories_pkey PRIMARY KEY (id)
);
INSERT INTO categories (id, label, emoji, sort_order) VALUES
  ('Beach',     'Beach',     '🏖', 1),
  ('City',      'City',      '🏙', 2),
  ('Culture',   'Culture',   '🎨', 3),
  ('Shopping',  'Shopping',  '🛍', 4),
  ('Nature',    'Nature',    '🌿', 5),
  ('Nightout',  'Nightout',  '🌙', 6),
  ('Work',      'Work',      '💻', 7),
  ('Themepark', 'Themepark', '🎢', 8)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS place_types (
    id         text    NOT NULL,
    label      text    NOT NULL,
    color      text    NOT NULL DEFAULT 'gray',
    sort_order integer NOT NULL DEFAULT 0,
    CONSTRAINT place_types_pkey PRIMARY KEY (id)
);
INSERT INTO place_types (id, label, color, sort_order) VALUES
  ('Restaurant', 'Restaurant', 'green',  1),
  ('Cafe',       'Cafe',       'amber',  2),
  ('Activity',   'Activity',   'purple', 3)
ON CONFLICT (id) DO NOTHING;

-- places.type CHECK 제약 제거 (동적 타입 지원)
ALTER TABLE places DROP CONSTRAINT IF EXISTS places_type_check;

CREATE TABLE IF NOT EXISTS users (
    id          uuid        NOT NULL DEFAULT gen_random_uuid(),
    email       text        NOT NULL,
    nickname    text        NOT NULL,
    avatar_url  text,
    provider    text        NOT NULL DEFAULT 'google',
    provider_id text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_unique UNIQUE (email)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);

ALTER TABLE cards
    ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

ALTER TABLE photos
    ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- sort_order for drag-to-reorder
ALTER TABLE cards  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE places ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- cover_photo_id: FK with ON DELETE SET NULL replaces plain text cover_photo URL.
-- Automatically clears the reference when the cover photo is deleted.
-- uploader_id: track who uploaded each photo so only they can delete it
ALTER TABLE photos ADD COLUMN IF NOT EXISTS uploader_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE cards ADD COLUMN IF NOT EXISTS cover_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL;
UPDATE cards c SET cover_photo_id = (
  SELECT p.id FROM photos p WHERE p.url = c.cover_photo AND p.card_id = c.id LIMIT 1
) WHERE c.cover_photo IS NOT NULL;
ALTER TABLE cards DROP COLUMN IF EXISTS cover_photo;

-- Sequence for race-condition-free sort_order on card creation
CREATE SEQUENCE IF NOT EXISTS card_sort_order_seq;
SELECT setval('card_sort_order_seq', COALESCE((SELECT MAX(sort_order) FROM cards), 0));

-- Performance indexes: prevent full table scans on common query patterns
CREATE INDEX IF NOT EXISTS idx_cards_user_id  ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_city_id  ON cards(city_id);
CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(category);
CREATE INDEX IF NOT EXISTS idx_photos_card_id ON photos(card_id);
CREATE INDEX IF NOT EXISTS idx_places_card_id ON places(card_id);
