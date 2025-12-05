use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    routing::{get, post, patch, delete},
    Router,
};
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod routes;
mod handlers;
mod models;
mod db;
mod sync;
mod auth;

use db::Database;
use auth::AuthState;

pub struct AppState {
    pub db: Database,
    pub auth: AuthState,
}

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "pdtodo_api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    // Initialize database
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://localhost/pdtodo".to_string());

    let db = Database::new(&database_url)
        .await
        .expect("Failed to connect to database");

    // Run migrations
    db.migrate().await.expect("Failed to run migrations");

    // Initialize auth state
    let auth = AuthState::new();

    let state = Arc::new(AppState { db, auth });

    // Build router
    let app = Router::new()
        // Health check
        .route("/health", get(routes::health::health_check))
        // Auth routes
        .route("/auth/google", post(routes::auth::google_auth))
        .route("/auth/refresh", post(routes::auth::refresh_token))
        .route("/auth/logout", post(routes::auth::logout))
        // Note routes
        .route("/notes", get(routes::notes::list_notes))
        .route("/notes", post(routes::notes::create_note))
        .route("/notes/:id", get(routes::notes::get_note))
        .route("/notes/:id", delete(routes::notes::delete_note))
        .route("/notes/:id/restore", post(routes::notes::restore_note))
        .route("/notes/:id/permanent", delete(routes::notes::permanent_delete))
        // Sync routes
        .route("/sync/push", post(routes::sync::push_updates))
        .route("/sync/pull", post(routes::sync::pull_updates))
        .route("/sync/live", get(routes::sync::websocket_handler))
        // User routes
        .route("/user/me", get(routes::user::get_current_user))
        .route("/user/settings", patch(routes::user::update_settings))
        // Middleware
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state);

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
