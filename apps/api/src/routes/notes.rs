use std::sync::Arc;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::AppState;
use crate::models::NoteMeta;

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
    pub state_vector: String,
}

pub async fn list_notes(
    State(_state): State<Arc<AppState>>,
    Query(_query): Query<ListNotesQuery>,
) -> Json<NotesListResponse> {
    // TODO: Fetch notes from database
    Json(NotesListResponse {
        notes: vec![],
        server_time: chrono::Utc::now().timestamp_millis(),
    })
}

pub async fn create_note(
    State(_state): State<Arc<AppState>>,
    Json(_payload): Json<CreateNoteRequest>,
) -> Json<CreateNoteResponse> {
    // TODO: Create note in database
    Json(CreateNoteResponse {
        id: Uuid::now_v7(),
        created_at: chrono::Utc::now().timestamp_millis(),
    })
}

pub async fn get_note(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<Uuid>,
) -> Json<NoteResponse> {
    // TODO: Fetch note from database
    Json(NoteResponse {
        id: Uuid::now_v7(),
        title: "".to_string(),
        content: "".to_string(),
        starred: false,
        created_at: 0,
        updated_at: 0,
        state_vector: "".to_string(),
    })
}

pub async fn delete_note(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    // TODO: Soft delete note
    Json(serde_json::json!({
        "deletedAt": chrono::Utc::now().timestamp_millis()
    }))
}

pub async fn restore_note(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    // TODO: Restore note from trash
    Json(serde_json::json!({
        "restoredAt": chrono::Utc::now().timestamp_millis()
    }))
}

pub async fn permanent_delete(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    // TODO: Permanently delete note
    Json(serde_json::json!({ "success": true }))
}
