use std::sync::Arc;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    http::StatusCode,
    response::Response,
    Json,
};
use base64::Engine;
use chrono::{DateTime, Utc};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::auth::AuthUser;
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPushRequest {
    pub updates: Vec<UpdateItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateItem {
    #[serde(rename = "noteId")]
    pub note_id: String,
    pub update: String, // Base64 encoded
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPushResponse {
    pub processed: Vec<String>,
    pub conflicts: Vec<String>,
    #[serde(rename = "serverTime")]
    pub server_time: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPullRequest {
    #[serde(rename = "stateVectors")]
    pub state_vectors: std::collections::HashMap<String, String>,
    pub since: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPullResponse {
    pub updates: std::collections::HashMap<String, Vec<String>>,
    #[serde(rename = "newNotes")]
    pub new_notes: Vec<NewNote>,
    #[serde(rename = "deletedNotes")]
    pub deleted_notes: Vec<String>,
    #[serde(rename = "serverTime")]
    pub server_time: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewNote {
    pub id: String,
    pub title: String,
    pub content: String, // Base64 encoded
    pub starred: bool,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
}

pub async fn push_updates(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(payload): Json<SyncPushRequest>,
) -> Result<Json<SyncPushResponse>, (StatusCode, String)> {
    let mut processed = Vec::new();
    let mut conflicts = Vec::new();

    for update_item in payload.updates {
        let note_id = Uuid::parse_str(&update_item.note_id)
            .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid note ID".to_string()))?;

        // Verify user owns this note
        let note = state
            .db
            .get_note(note_id, auth_user.user_id)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

        if note.is_none() {
            conflicts.push(update_item.note_id.clone());
            continue;
        }

        // Decode and store update
        let update_data = base64::engine::general_purpose::STANDARD
            .decode(&update_item.update)
            .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid base64 update: {}", e)))?;

        // Store sync update for other clients
        state
            .db
            .store_sync_update(note_id, &update_data, None)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to store update: {}", e)))?;

        // Apply update to note content (merge Yjs update)
        // For now, we just update the content directly - full CRDT merge would be more complex
        let note = note.unwrap();
        let mut new_content = note.content.clone();
        new_content.extend_from_slice(&update_data);

        state
            .db
            .update_note(
                note_id,
                auth_user.user_id,
                None,
                Some(&new_content),
                None,
                None,
            )
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to update note: {}", e)))?;

        processed.push(update_item.note_id);
    }

    Ok(Json(SyncPushResponse {
        processed,
        conflicts,
        server_time: Utc::now().timestamp_millis(),
    }))
}

pub async fn pull_updates(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(payload): Json<SyncPullRequest>,
) -> Result<Json<SyncPullResponse>, (StatusCode, String)> {
    let since = DateTime::<Utc>::from_timestamp_millis(payload.since)
        .unwrap_or_else(|| DateTime::<Utc>::from_timestamp(0, 0).unwrap());

    // Get all notes updated since timestamp
    let notes = state
        .db
        .list_notes(auth_user.user_id, true, Some(since))
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    let mut updates: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    let mut new_notes = Vec::new();
    let mut deleted_notes = Vec::new();

    for note in notes {
        let note_id = note.id.to_string();

        if note.deleted_at.is_some() {
            deleted_notes.push(note_id);
            continue;
        }

        // Check if client has this note
        if !payload.state_vectors.contains_key(&note_id) {
            // Client doesn't have this note - send full content
            new_notes.push(NewNote {
                id: note_id,
                title: note.title,
                content: base64::engine::general_purpose::STANDARD.encode(&note.content),
                starred: note.starred,
                created_at: note.created_at.timestamp_millis(),
            });
        } else {
            // Client has this note - send updates since their last sync
            let note_updates = state
                .db
                .get_sync_updates_since(note.id, since)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

            if !note_updates.is_empty() {
                let encoded_updates: Vec<String> = note_updates
                    .into_iter()
                    .map(|(_, data)| base64::engine::general_purpose::STANDARD.encode(&data))
                    .collect();
                updates.insert(note_id, encoded_updates);
            }
        }
    }

    Ok(Json(SyncPullResponse {
        updates,
        new_notes,
        deleted_notes,
        server_time: Utc::now().timestamp_millis(),
    }))
}

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

#[derive(Debug, Serialize, Deserialize)]
struct WsMessage {
    #[serde(rename = "type")]
    msg_type: String,
    #[serde(flatten)]
    data: serde_json::Value,
}

async fn handle_socket(socket: WebSocket, _state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();

    // Send welcome message
    let welcome = serde_json::json!({
        "type": "connected",
        "serverTime": Utc::now().timestamp_millis()
    });
    if sender.send(Message::Text(welcome.to_string().into())).await.is_err() {
        return;
    }

    // Handle incoming messages
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                // Parse and handle message
                if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                    match ws_msg.msg_type.as_str() {
                        "ping" => {
                            let pong = serde_json::json!({
                                "type": "pong",
                                "serverTime": Utc::now().timestamp_millis()
                            });
                            if sender.send(Message::Text(pong.to_string().into())).await.is_err() {
                                break;
                            }
                        }
                        "subscribe" => {
                            // Client wants to subscribe to note updates
                            let ack = serde_json::json!({
                                "type": "subscribed",
                                "noteId": ws_msg.data.get("noteId")
                            });
                            if sender.send(Message::Text(ack.to_string().into())).await.is_err() {
                                break;
                            }
                        }
                        _ => {}
                    }
                }
            }
            Ok(Message::Close(_)) => break,
            Err(_) => break,
            _ => {}
        }
    }
}
