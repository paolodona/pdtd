// Yjs sync handling module
// Will contain server-side Yjs document processing

use serde::{Deserialize, Serialize};

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
