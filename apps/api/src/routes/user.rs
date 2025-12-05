use std::sync::Arc;
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use crate::AppState;

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    pub settings: UserSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    #[serde(rename = "fontSize", default = "default_font_size")]
    pub font_size: i32,
    #[serde(rename = "sidebarWidth", default = "default_sidebar_width")]
    pub sidebar_width: i32,
}

fn default_font_size() -> i32 { 16 }
fn default_sidebar_width() -> i32 { 280 }

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            font_size: 16,
            sidebar_width: 280,
        }
    }
}

pub async fn get_current_user(
    State(_state): State<Arc<AppState>>,
) -> Json<UserResponse> {
    // TODO: Get user from JWT token
    Json(UserResponse {
        id: "user_placeholder".to_string(),
        email: "user@example.com".to_string(),
        name: Some("User".to_string()),
        picture: None,
        created_at: chrono::Utc::now().timestamp_millis(),
        settings: UserSettings::default(),
    })
}

pub async fn update_settings(
    State(_state): State<Arc<AppState>>,
    Json(settings): Json<UserSettings>,
) -> Json<serde_json::Value> {
    // TODO: Update user settings in database
    Json(serde_json::json!({ "settings": settings }))
}
