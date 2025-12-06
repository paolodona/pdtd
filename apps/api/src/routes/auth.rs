use std::sync::Arc;
use axum::{extract::State, http::StatusCode, Json};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};

use crate::AppState;

const ACCESS_TOKEN_EXPIRY: u64 = 3600; // 1 hour
const REFRESH_TOKEN_EXPIRY_DAYS: i64 = 30;

#[derive(Debug, Deserialize)]
pub struct GoogleAuthRequest {
    pub code: String,
    #[serde(rename = "redirectUri")]
    pub redirect_uri: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "refreshToken")]
    pub refresh_token: String,
    #[serde(rename = "expiresIn")]
    pub expires_in: u64,
    pub user: UserInfo,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    #[serde(rename = "refreshToken")]
    pub refresh_token: String,
}

#[derive(Debug, Deserialize)]
struct GoogleTokenResponse {
    access_token: String,
    #[allow(dead_code)]
    expires_in: u64,
    #[allow(dead_code)]
    token_type: String,
}

#[derive(Debug, Deserialize)]
struct GoogleUserInfo {
    id: String,
    email: String,
    name: Option<String>,
    picture: Option<String>,
}

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn generate_refresh_token() -> String {
    use base64::Engine;
    let bytes: [u8; 32] = rand::random();
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

pub async fn google_auth(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<GoogleAuthRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    let client_id = std::env::var("GOOGLE_CLIENT_ID")
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Google OAuth not configured".to_string()))?;
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET")
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Google OAuth not configured".to_string()))?;

    // Exchange code for tokens
    let client = reqwest::Client::new();
    let token_response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", payload.code.as_str()),
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("redirect_uri", payload.redirect_uri.as_str()),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Failed to exchange code: {}", e)))?;

    if !token_response.status().is_success() {
        let error_text = token_response.text().await.unwrap_or_default();
        tracing::error!("Google token exchange failed: {}", error_text);
        return Err((StatusCode::BAD_REQUEST, "Failed to exchange authorization code".to_string()));
    }

    let google_tokens: GoogleTokenResponse = token_response
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Failed to parse Google response: {}", e)))?;

    // Fetch user info
    let user_response = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(&google_tokens.access_token)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Failed to fetch user info: {}", e)))?;

    let google_user: GoogleUserInfo = user_response
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Failed to parse user info: {}", e)))?;

    // Find or create user
    let user = match state.db.get_user_by_google_id(&google_user.id).await {
        Ok(Some(user)) => {
            // Update user info if changed
            state.db.update_user(
                user.id,
                google_user.name.as_deref(),
                google_user.picture.as_deref(),
            ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?
        }
        Ok(None) => {
            // Create new user
            state.db.create_user(
                &google_user.email,
                google_user.name.as_deref(),
                google_user.picture.as_deref(),
                Some(&google_user.id),
            ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create user: {}", e)))?
        }
        Err(e) => {
            return Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)));
        }
    };

    // Generate tokens
    let access_token = state.auth.create_token(&user.id.to_string(), ACCESS_TOKEN_EXPIRY)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create token: {}", e)))?;

    let refresh_token = generate_refresh_token();
    let refresh_token_hash = hash_token(&refresh_token);
    let expires_at = Utc::now() + Duration::days(REFRESH_TOKEN_EXPIRY_DAYS);

    state.db.create_refresh_token(user.id, &refresh_token_hash, None, expires_at)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to store refresh token: {}", e)))?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        expires_in: ACCESS_TOKEN_EXPIRY,
        user: UserInfo {
            id: user.id.to_string(),
            email: user.email,
            name: user.name,
            picture: user.picture_url,
        },
    }))
}

pub async fn refresh_token(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    let token_hash = hash_token(&payload.refresh_token);

    // Find and validate refresh token
    let refresh_token_record = state.db.get_refresh_token(&token_hash)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?
        .ok_or((StatusCode::UNAUTHORIZED, "Invalid refresh token".to_string()))?;

    // Get user
    let user = state.db.get_user_by_id(refresh_token_record.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?
        .ok_or((StatusCode::UNAUTHORIZED, "User not found".to_string()))?;

    // Delete old refresh token
    state.db.delete_refresh_token(&token_hash)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    // Generate new tokens
    let access_token = state.auth.create_token(&user.id.to_string(), ACCESS_TOKEN_EXPIRY)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create token: {}", e)))?;

    let new_refresh_token = generate_refresh_token();
    let new_refresh_token_hash = hash_token(&new_refresh_token);
    let expires_at = Utc::now() + Duration::days(REFRESH_TOKEN_EXPIRY_DAYS);

    state.db.create_refresh_token(user.id, &new_refresh_token_hash, None, expires_at)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to store refresh token: {}", e)))?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token: new_refresh_token,
        expires_in: ACCESS_TOKEN_EXPIRY,
        user: UserInfo {
            id: user.id.to_string(),
            email: user.email,
            name: user.name,
            picture: user.picture_url,
        },
    }))
}

pub async fn logout(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RefreshRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let token_hash = hash_token(&payload.refresh_token);

    state.db.delete_refresh_token(&token_hash)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;

    Ok(Json(serde_json::json!({ "success": true })))
}
