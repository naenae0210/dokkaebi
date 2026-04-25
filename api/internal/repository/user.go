package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"hangwith/api/internal/model"
)

type UserRepo struct {
	db *sqlx.DB
}

func NewUserRepo(db *sqlx.DB) *UserRepo {
	return &UserRepo{db: db}
}

// UpsertByProvider inserts a new user or updates nickname/avatar on existing OAuth identity.
func (r *UserRepo) UpsertByProvider(
	ctx context.Context,
	provider, providerID, email, nickname string,
	avatarURL *string,
) (*model.User, error) {
	var u model.User
	err := r.db.QueryRowxContext(ctx, `
		INSERT INTO users (id, email, nickname, avatar_url, provider, provider_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (provider, provider_id) DO UPDATE
		  SET email      = EXCLUDED.email,
		      nickname   = EXCLUDED.nickname,
		      avatar_url = EXCLUDED.avatar_url,
		      updated_at = now()
		RETURNING *
	`, uuid.New().String(), email, nickname, avatarURL, provider, providerID).StructScan(&u)
	return &u, err
}

func (r *UserRepo) FindByID(ctx context.Context, id string) (*model.User, error) {
	var u model.User
	err := r.db.GetContext(ctx, &u, `SELECT * FROM users WHERE id = $1`, id)
	return &u, err
}
