use std::sync::Arc;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use base64::Engine;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::AuthUser;
use crate::models::NoteMeta;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ListNotesQuery {
    #[serde(rename = "includeDeleted", default)]
    pub include_deleted: bool,
    pub since: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct NotesListResponse {
    pub notes: Vec<NoteMeta>,
    #[serde(rename = "serverTime")]
    pub server_time: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateNoteRequest {
    pub id: Uuid,
    pub title: String,
    pub content: String, // Base64 encoded Yjs doc
    #[serde(default)]
    pub starred: bool,
}

#[derive(Debug, Serialize)]
pub struct CreateNoteResponse {
    pub id: Uuid,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
}

#[derive(Debug, Serialize)]
pub struct NoteResponse {
    pub id: Uuid,
    pub title: String,
    pub content: String, // Base64 encoded
    pub starred: bool,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    #[serde(rename = "stateVector")]
    pub state_vector: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateNoteRequest {
    pub title: Option<String>,
    pub content: Option<String>, // Base64 encoded
    pub starred: Option<bool>,
    #[serde(rename = "stateVector")]
    pub state_vector: Option<String>,
}

pub async fn list_notes(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Query(query): Query<ListNotesQuery>,
) -> Result<Json<NotesListResponse>, (StatusCode, String)> {
    let since = query.since.map(|ts| {
        DateTime::<Utc>::from_timestamp_millis(ts).unwrap_or_else(Utc::now)
    });

    let notes = state
        .db
        .list_notes(auth_user.user_id, query.include_deleted, since)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    let notes_meta: Vec<NoteMeta> = notes.into_iter().map(NoteMeta::from).collect();

    Ok(Json(NotesListResponse {
        notes: notes_meta,
        server_time: Utc::now().timestamp_millis(),
    }))
}

pub async fn create_note(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(payload): Json<CreateNoteRequest>,
) -> Result<Json<CreateNoteResponse>, (StatusCode, String)> {
    let content = base64::engine::general_purpose::STANDARD
        .decode(&payload.content)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid base64 content: {}", e)))?;

    let note = state
        .db
        .create_note(payload.id, auth_user.user_id, &payload.title, &content, payload.starred)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create note: {}", e)))?;

    Ok(Json(CreateNoteResponse {
        id: note.id,
        created_at: note.created_at.timestamp_millis(),
    }))
}

pub async fn get_note(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<NoteResponse>, (StatusCode, String)> {
    let note = state
        .db
        .get_note(id, auth_user.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?
        .ok_or((StatusCode::NOT_FOUND, "Note not found".to_string()))?;

    Ok(Json(NoteResponse {
        id: note.id,
        title: note.title,
        content: base64::engine::general_purpose::STANDARD.encode(&note.content),
        starred: note.starred,
        created_at: note.created_at.timestamp_millis(),
        updated_at: note.updated_at.timestamp_millis(),
        state_vector: note.state_vector.map(|sv| base64::engine::general_purpose::STANDARD.encode(&sv)),
    }))
}

pub async fn update_note(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateNoteRequest>,
) -> Result<Json<NoteResponse>, (StatusCode, String)> {
    let content = payload
        .content
        .as_ref()
        .map(|c| {
            base64::engine::general_purpose::STANDARD
                .decode(c)
                .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid base64 content: {}", e)))
        })
        .transpose()?;

    let state_vector = payload
        .state_vector
        .as_ref()
        .map(|sv| {
            base64::engine::general_purpose::STANDARD
                .decode(sv)
                .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid base64 state_vector: {}", e)))
        })
        .transpose()?;

    let note = state
        .db
        .update_note(
            id,
            auth_user.user_id,
            payload.title.as_deref(),
            content.as_deref(),
            state_vector.as_deref(),
            payload.starred,
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update note: {}", e)))?;

    Ok(Json(NoteResponse {
        id: note.id,
        title: note.title,
        content: base64::engine::general_purpose::STANDARD.encode(&note.content),
        starred: note.starred,
        created_at: note.created_at.timestamp_millis(),
        updated_at: note.updated_at.timestamp_millis(),
        state_vector: note.state_vector.map(|sv| base64::engine::general_purpose::STANDARD.encode(&sv)),
    }))
}

pub async fn delete_note(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let note = state
        .db
        .soft_delete_note(id, auth_user.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to delete note: {}", e)))?;

    Ok(Json(serde_json::json!({
        "deletedAt": note.deleted_at.map(|dt| dt.timestamp_millis())
    })))
}

pub async fn restore_note(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let note = state
        .db
        .restore_note(id, auth_user.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to restore note: {}", e)))?;

    Ok(Json(serde_json::json!({
        "restoredAt": note.updated_at.timestamp_millis()
    })))
}

pub async fn permanent_delete(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let rows = state
        .db
        .permanent_delete_note(id, auth_user.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to delete note: {}", e)))?;

    if rows == 0 {
        return Err((StatusCode::NOT_FOUND, "Note not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "success": true })))
}
