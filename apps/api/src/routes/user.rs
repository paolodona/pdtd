use std::sync::Arc;
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};

use crate::auth::AuthUser;
use crate::AppState;

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    pub settings: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    #[serde(rename = "fontSize", default = "default_font_size")]
    pub font_size: i32,
    #[serde(rename = "sidebarWidth", default = "default_sidebar_width")]
    pub sidebar_width: i32,
}

fn default_font_size() -> i32 {
    16
}
fn default_sidebar_width() -> i32 {
    280
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            font_size: 16,
            sidebar_width: 280,
        }
    }
}

pub async fn get_current_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Json<UserResponse>, (StatusCode, String)> {
    let user = state
        .db
        .get_user_by_id(auth_user.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?
        .ok_or((StatusCode::NOT_FOUND, "User not found".to_string()))?;

    Ok(Json(UserResponse {
        id: user.id.to_string(),
        email: user.email,
        name: user.name,
        picture: user.picture_url,
        created_at: user.created_at.timestamp_millis(),
        settings: user.settings,
    }))
}

pub async fn update_settings(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(settings): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let user = state
        .db
        .update_user_settings(auth_user.user_id, settings.clone())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    Ok(Json(serde_json::json!({ "settings": user.settings })))
}
