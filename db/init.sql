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

CREATE TABLE IF NOT EXISTS cities (
    id         uuid             NOT NULL DEFAULT gen_random_uuid(),
    name       text             NOT NULL,
    country    text             NOT NULL DEFAULT 'US',
    lat        double precision,
    lng        double precision,
    created_at timestamptz      DEFAULT now(),
    updated_at timestamptz      DEFAULT now(),
    CONSTRAINT cities_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS cards (
    id          uuid        NOT NULL DEFAULT gen_random_uuid(),
    user_id     uuid,
    city_id     uuid,
    category    text        NOT NULL,
    title       text        NOT NULL,
    cover_photo text,
    visibility  text        NOT NULL DEFAULT 'public',
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),
    CONSTRAINT cards_pkey        PRIMARY KEY (id),
    CONSTRAINT cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT cards_city_id_fkey FOREIGN KEY (city_id) REFERENCES cities(id)
);

CREATE TABLE IF NOT EXISTS names (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT names_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS photos (
    id         uuid        NOT NULL DEFAULT gen_random_uuid(),
    card_id    uuid,
    url        text        NOT NULL,
    "order"    integer     DEFAULT 0,
    visibility text        NOT NULL DEFAULT 'public',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT photos_pkey        PRIMARY KEY (id),
    CONSTRAINT photos_card_id_fkey FOREIGN KEY (card_id) REFERENCES cards(id)
);

CREATE TABLE IF NOT EXISTS places (
    id         uuid             NOT NULL DEFAULT gen_random_uuid(),
    card_id    uuid,
    name       text             NOT NULL,
    type       text             CHECK (type = ANY (ARRAY['Restaurant', 'Cafe', 'Activity'])),
    lat        double precision,
    lng        double precision,
    created_at timestamptz      DEFAULT now(),
    updated_at timestamptz      DEFAULT now(),
    CONSTRAINT places_pkey        PRIMARY KEY (id),
    CONSTRAINT places_card_id_fkey FOREIGN KEY (card_id) REFERENCES cards(id)
);
