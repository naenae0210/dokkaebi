-- Run this against an existing database to apply schema changes.
-- Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS checks).

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
