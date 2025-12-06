use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Error};
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::models::{User, Note, RefreshToken};

pub struct Database {
    pool: PgPool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, Error> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(database_url)
            .await?;

        Ok(Self { pool })
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn migrate(&self) -> Result<(), Error> {
        sqlx::migrate!("./migrations").run(&self.pool).await?;
        Ok(())
    }

    // User queries
    pub async fn get_user_by_id(&self, id: Uuid) -> Result<Option<User>, Error> {
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn get_user_by_email(&self, email: &str) -> Result<Option<User>, Error> {
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
            .bind(email)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn get_user_by_google_id(&self, google_id: &str) -> Result<Option<User>, Error> {
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE google_id = $1")
            .bind(google_id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn create_user(
        &self,
        email: &str,
        name: Option<&str>,
        picture_url: Option<&str>,
        google_id: Option<&str>,
    ) -> Result<User, Error> {
        sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (email, name, picture_url, google_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
        )
        .bind(email)
        .bind(name)
        .bind(picture_url)
        .bind(google_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_user(
        &self,
        id: Uuid,
        name: Option<&str>,
        picture_url: Option<&str>,
    ) -> Result<User, Error> {
        sqlx::query_as::<_, User>(
            r#"
            UPDATE users
            SET name = COALESCE($2, name), picture_url = COALESCE($3, picture_url)
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(name)
        .bind(picture_url)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_user_settings(
        &self,
        id: Uuid,
        settings: serde_json::Value,
    ) -> Result<User, Error> {
        sqlx::query_as::<_, User>(
            r#"
            UPDATE users SET settings = $2 WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(settings)
        .fetch_one(&self.pool)
        .await
    }

    // Note queries
    pub async fn list_notes(
        &self,
        user_id: Uuid,
        include_deleted: bool,
        since: Option<DateTime<Utc>>,
    ) -> Result<Vec<Note>, Error> {
        let query = if include_deleted {
            if let Some(since_time) = since {
                sqlx::query_as::<_, Note>(
                    "SELECT * FROM notes WHERE user_id = $1 AND updated_at > $2 ORDER BY updated_at DESC",
                )
                .bind(user_id)
                .bind(since_time)
                .fetch_all(&self.pool)
                .await
            } else {
                sqlx::query_as::<_, Note>(
                    "SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC",
                )
                .bind(user_id)
                .fetch_all(&self.pool)
                .await
            }
        } else if let Some(since_time) = since {
            sqlx::query_as::<_, Note>(
                "SELECT * FROM notes WHERE user_id = $1 AND deleted_at IS NULL AND updated_at > $2 ORDER BY updated_at DESC",
            )
            .bind(user_id)
            .bind(since_time)
            .fetch_all(&self.pool)
            .await
        } else {
            sqlx::query_as::<_, Note>(
                "SELECT * FROM notes WHERE user_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC",
            )
            .bind(user_id)
            .fetch_all(&self.pool)
            .await
        };
        query
    }

    pub async fn get_note(&self, id: Uuid, user_id: Uuid) -> Result<Option<Note>, Error> {
        sqlx::query_as::<_, Note>(
            "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn create_note(
        &self,
        id: Uuid,
        user_id: Uuid,
        title: &str,
        content: &[u8],
        starred: bool,
    ) -> Result<Note, Error> {
        sqlx::query_as::<_, Note>(
            r#"
            INSERT INTO notes (id, user_id, title, content, starred)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(title)
        .bind(content)
        .bind(starred)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_note(
        &self,
        id: Uuid,
        user_id: Uuid,
        title: Option<&str>,
        content: Option<&[u8]>,
        state_vector: Option<&[u8]>,
        starred: Option<bool>,
    ) -> Result<Note, Error> {
        sqlx::query_as::<_, Note>(
            r#"
            UPDATE notes
            SET
                title = COALESCE($3, title),
                content = COALESCE($4, content),
                state_vector = COALESCE($5, state_vector),
                starred = COALESCE($6, starred),
                version = version + 1
            WHERE id = $1 AND user_id = $2
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(user_id)
        .bind(title)
        .bind(content)
        .bind(state_vector)
        .bind(starred)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn soft_delete_note(&self, id: Uuid, user_id: Uuid) -> Result<Note, Error> {
        sqlx::query_as::<_, Note>(
            "UPDATE notes SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
        )
        .bind(id)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn restore_note(&self, id: Uuid, user_id: Uuid) -> Result<Note, Error> {
        sqlx::query_as::<_, Note>(
            "UPDATE notes SET deleted_at = NULL WHERE id = $1 AND user_id = $2 RETURNING *",
        )
        .bind(id)
        .bind(user_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn permanent_delete_note(&self, id: Uuid, user_id: Uuid) -> Result<u64, Error> {
        let result = sqlx::query("DELETE FROM notes WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    // Refresh token queries
    pub async fn create_refresh_token(
        &self,
        user_id: Uuid,
        token_hash: &str,
        device_info: Option<serde_json::Value>,
        expires_at: DateTime<Utc>,
    ) -> Result<RefreshToken, Error> {
        sqlx::query_as::<_, RefreshToken>(
            r#"
            INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(token_hash)
        .bind(device_info)
        .bind(expires_at)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_refresh_token(&self, token_hash: &str) -> Result<Option<RefreshToken>, Error> {
        sqlx::query_as::<_, RefreshToken>(
            "SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()",
        )
        .bind(token_hash)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn delete_refresh_token(&self, token_hash: &str) -> Result<u64, Error> {
        let result = sqlx::query("DELETE FROM refresh_tokens WHERE token_hash = $1")
            .bind(token_hash)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    pub async fn delete_user_refresh_tokens(&self, user_id: Uuid) -> Result<u64, Error> {
        let result = sqlx::query("DELETE FROM refresh_tokens WHERE user_id = $1")
            .bind(user_id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    // Sync update queries
    pub async fn store_sync_update(
        &self,
        note_id: Uuid,
        update_data: &[u8],
        client_id: Option<&str>,
    ) -> Result<i64, Error> {
        let row: (i64,) = sqlx::query_as(
            r#"
            INSERT INTO sync_updates (note_id, update_data, client_id)
            VALUES ($1, $2, $3)
            RETURNING id
            "#,
        )
        .bind(note_id)
        .bind(update_data)
        .bind(client_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row.0)
    }

    pub async fn get_sync_updates_since(
        &self,
        note_id: Uuid,
        since: DateTime<Utc>,
    ) -> Result<Vec<(i64, Vec<u8>)>, Error> {
        sqlx::query_as(
            "SELECT id, update_data FROM sync_updates WHERE note_id = $1 AND created_at > $2 ORDER BY id ASC",
        )
        .bind(note_id)
        .bind(since)
        .fetch_all(&self.pool)
        .await
    }
}
