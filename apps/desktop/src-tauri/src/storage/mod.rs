use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;
use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Note not found: {0}")]
    NoteNotFound(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, StorageError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteMeta {
    pub id: String,
    pub title: String,
    pub starred: bool,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    #[serde(rename = "deletedAt")]
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: Vec<u8>,
    pub starred: bool,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    #[serde(rename = "deletedAt")]
    pub deleted_at: Option<i64>,
}

pub struct Storage {
    conn: Mutex<Connection>,
    notes_dir: std::path::PathBuf,
}

impl Storage {
    pub fn new(app_data_dir: &Path) -> Result<Self> {
        let db_path = app_data_dir.join("pdtodo.db");
        let notes_dir = app_data_dir.join("notes");
        std::fs::create_dir_all(&notes_dir)?;

        let conn = Connection::open(&db_path)?;

        // Initialize database schema
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL DEFAULT '',
                starred INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER
            );

            CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
            CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);

            -- Full-text search
            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                id UNINDEXED,
                title,
                content,
                content=notes,
                content_rowid=rowid
            );

            -- Triggers to keep FTS in sync
            CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
                INSERT INTO notes_fts(id, title) VALUES (new.id, new.title);
            END;

            CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
                DELETE FROM notes_fts WHERE id = old.id;
                INSERT INTO notes_fts(id, title) VALUES (new.id, new.title);
            END;

            CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
                DELETE FROM notes_fts WHERE id = old.id;
            END;
            "#,
        )?;

        Ok(Self {
            conn: Mutex::new(conn),
            notes_dir,
        })
    }

    pub fn get_notes(&self, include_deleted: bool) -> Result<Vec<NoteMeta>> {
        let conn = self.conn.lock().unwrap();
        let query = if include_deleted {
            "SELECT id, title, starred, created_at, updated_at, deleted_at FROM notes ORDER BY updated_at DESC"
        } else {
            "SELECT id, title, starred, created_at, updated_at, deleted_at FROM notes WHERE deleted_at IS NULL ORDER BY updated_at DESC"
        };

        let mut stmt = conn.prepare(query)?;
        let notes = stmt
            .query_map([], |row| {
                Ok(NoteMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    starred: row.get::<_, i32>(2)? != 0,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    deleted_at: row.get(5)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(notes)
    }

    pub fn get_note(&self, id: &str) -> Result<Note> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, starred, created_at, updated_at, deleted_at FROM notes WHERE id = ?",
        )?;

        let meta = stmt.query_row([id], |row| {
            Ok(NoteMeta {
                id: row.get(0)?,
                title: row.get(1)?,
                starred: row.get::<_, i32>(2)? != 0,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                deleted_at: row.get(5)?,
            })
        }).map_err(|_| StorageError::NoteNotFound(id.to_string()))?;

        // Load content from file
        let content_path = self.notes_dir.join(format!("{}.yjs", id));
        let content = if content_path.exists() {
            std::fs::read(&content_path)?
        } else {
            Vec::new()
        };

        Ok(Note {
            id: meta.id,
            title: meta.title,
            content,
            starred: meta.starred,
            created_at: meta.created_at,
            updated_at: meta.updated_at,
            deleted_at: meta.deleted_at,
        })
    }

    pub fn create_note(&self, title: &str) -> Result<String> {
        let id = Uuid::now_v7().to_string();
        let now = chrono::Utc::now().timestamp_millis();

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO notes (id, title, starred, created_at, updated_at) VALUES (?, ?, 0, ?, ?)",
            params![id, title, now, now],
        )?;

        Ok(id)
    }

    pub fn update_note_title(&self, id: &str, title: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute(
            "UPDATE notes SET title = ?, updated_at = ? WHERE id = ?",
            params![title, now, id],
        )?;

        if rows == 0 {
            return Err(StorageError::NoteNotFound(id.to_string()));
        }

        Ok(())
    }

    pub fn update_note_starred(&self, id: &str, starred: bool) -> Result<()> {
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute(
            "UPDATE notes SET starred = ?, updated_at = ? WHERE id = ?",
            params![starred as i32, now, id],
        )?;

        if rows == 0 {
            return Err(StorageError::NoteNotFound(id.to_string()));
        }

        Ok(())
    }

    pub fn update_note_content(&self, id: &str, content: &[u8]) -> Result<()> {
        // Update timestamp in database
        let now = chrono::Utc::now().timestamp_millis();
        {
            let conn = self.conn.lock().unwrap();
            let rows = conn.execute(
                "UPDATE notes SET updated_at = ? WHERE id = ?",
                params![now, id],
            )?;

            if rows == 0 {
                return Err(StorageError::NoteNotFound(id.to_string()));
            }
        }

        // Save content to file
        let content_path = self.notes_dir.join(format!("{}.yjs", id));
        std::fs::write(&content_path, content)?;

        Ok(())
    }

    pub fn delete_note(&self, id: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute(
            "UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?",
            params![now, now, id],
        )?;

        if rows == 0 {
            return Err(StorageError::NoteNotFound(id.to_string()));
        }

        Ok(())
    }

    pub fn restore_note(&self, id: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp_millis();
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute(
            "UPDATE notes SET deleted_at = NULL, updated_at = ? WHERE id = ?",
            params![now, id],
        )?;

        if rows == 0 {
            return Err(StorageError::NoteNotFound(id.to_string()));
        }

        Ok(())
    }

    pub fn permanently_delete_note(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute("DELETE FROM notes WHERE id = ?", params![id])?;

        if rows == 0 {
            return Err(StorageError::NoteNotFound(id.to_string()));
        }

        // Delete content file
        let content_path = self.notes_dir.join(format!("{}.yjs", id));
        if content_path.exists() {
            std::fs::remove_file(&content_path)?;
        }

        Ok(())
    }

    pub fn duplicate_note(&self, id: &str) -> Result<String> {
        let original = self.get_note(id)?;
        let new_id = Uuid::now_v7().to_string();
        let now = chrono::Utc::now().timestamp_millis();

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO notes (id, title, starred, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            params![new_id, format!("{} (copy)", original.title), original.starred as i32, now, now],
        )?;

        // Copy content file
        if !original.content.is_empty() {
            let content_path = self.notes_dir.join(format!("{}.yjs", new_id));
            std::fs::write(&content_path, &original.content)?;
        }

        Ok(new_id)
    }

    pub fn search_notes(&self, query: &str) -> Result<Vec<NoteMeta>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT n.id, n.title, n.starred, n.created_at, n.updated_at, n.deleted_at
            FROM notes n
            JOIN notes_fts fts ON n.id = fts.id
            WHERE notes_fts MATCH ? AND n.deleted_at IS NULL
            ORDER BY rank
            "#,
        )?;

        let notes = stmt
            .query_map([format!("title:{}", query)], |row| {
                Ok(NoteMeta {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    starred: row.get::<_, i32>(2)? != 0,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    deleted_at: row.get(5)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(notes)
    }
}
