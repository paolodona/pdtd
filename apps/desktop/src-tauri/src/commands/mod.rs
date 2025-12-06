use crate::logging::{AppLogger, LogEntry};
use crate::storage::{NoteMeta, Note, Storage};
use serde::Serialize;
use tauri::{Manager, State};

#[tauri::command]
pub fn get_notes(storage: State<Storage>) -> Result<Vec<NoteMeta>, String> {
    storage
        .get_notes(true)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_note(storage: State<Storage>, note_id: String) -> Result<Note, String> {
    storage
        .get_note(&note_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_note(storage: State<Storage>, logger: State<AppLogger>, title: String) -> Result<String, String> {
    let result = storage
        .create_note(&title)
        .map_err(|e| e.to_string());

    if let Ok(ref note_id) = result {
        logger.info("notes", &format!("Created note: {} ({})", title, note_id));
    }
    result
}

#[tauri::command]
pub fn update_note_title(
    storage: State<Storage>,
    logger: State<AppLogger>,
    note_id: String,
    title: String,
) -> Result<(), String> {
    let result = storage
        .update_note_title(&note_id, &title)
        .map_err(|e| e.to_string());

    if result.is_ok() {
        logger.info("notes", &format!("Updated title: {} -> {}", note_id, title));
    }
    result
}

#[tauri::command]
pub fn update_note_starred(
    storage: State<Storage>,
    logger: State<AppLogger>,
    note_id: String,
    starred: bool,
) -> Result<(), String> {
    let result = storage
        .update_note_starred(&note_id, starred)
        .map_err(|e| e.to_string());

    if result.is_ok() {
        let action = if starred { "Starred" } else { "Unstarred" };
        logger.info("notes", &format!("{} note: {}", action, note_id));
    }
    result
}

#[tauri::command]
pub fn update_note_content(
    storage: State<Storage>,
    logger: State<AppLogger>,
    note_id: String,
    content: Vec<u8>,
) -> Result<(), String> {
    let result = storage
        .update_note_content(&note_id, &content)
        .map_err(|e| e.to_string());

    if result.is_ok() {
        logger.info("notes", &format!("Updated content: {} ({} bytes)", note_id, content.len()));
    }
    result
}

#[tauri::command]
pub fn delete_note(storage: State<Storage>, logger: State<AppLogger>, note_id: String) -> Result<(), String> {
    let result = storage
        .delete_note(&note_id)
        .map_err(|e| e.to_string());

    if result.is_ok() {
        logger.info("notes", &format!("Moved to trash: {}", note_id));
    }
    result
}

#[tauri::command]
pub fn restore_note(storage: State<Storage>, logger: State<AppLogger>, note_id: String) -> Result<(), String> {
    let result = storage
        .restore_note(&note_id)
        .map_err(|e| e.to_string());

    if result.is_ok() {
        logger.info("notes", &format!("Restored from trash: {}", note_id));
    }
    result
}

#[tauri::command]
pub fn permanently_delete_note(storage: State<Storage>, logger: State<AppLogger>, note_id: String) -> Result<(), String> {
    let result = storage
        .permanently_delete_note(&note_id)
        .map_err(|e| e.to_string());

    if result.is_ok() {
        logger.info("notes", &format!("Permanently deleted: {}", note_id));
    }
    result
}

#[tauri::command]
pub fn duplicate_note(storage: State<Storage>, logger: State<AppLogger>, note_id: String) -> Result<String, String> {
    let result = storage
        .duplicate_note(&note_id)
        .map_err(|e| e.to_string());

    if let Ok(ref new_id) = result {
        logger.info("notes", &format!("Duplicated {} -> {}", note_id, new_id));
    }
    result
}

#[tauri::command]
pub fn search_notes(storage: State<Storage>, query: String) -> Result<Vec<NoteMeta>, String> {
    storage
        .search_notes(&query)
        .map_err(|e| e.to_string())
}

// App info and logging commands

#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub version: String,
    pub data_dir: String,
    pub environment: String,
}

#[tauri::command]
pub fn get_app_info(app_handle: tauri::AppHandle) -> Result<AppInfo, String> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();

    let version = app_handle.package_info().version.to_string();

    let environment = if cfg!(debug_assertions) {
        "development".to_string()
    } else {
        "production".to_string()
    };

    Ok(AppInfo {
        version,
        data_dir,
        environment,
    })
}

#[tauri::command]
pub fn get_logs(logger: State<AppLogger>) -> Vec<LogEntry> {
    logger.get_entries()
}

#[tauri::command]
pub fn get_logs_since(logger: State<AppLogger>, since: i64) -> Vec<LogEntry> {
    logger.get_entries_since(since)
}

#[tauri::command]
pub fn add_log(logger: State<AppLogger>, level: String, category: String, message: String) {
    logger.log(&level, &category, &message);
}

/// Fetch the title of a URL by making an HTTP request and extracting the <title> tag
#[tauri::command]
pub async fn fetch_url_title(url: String) -> Result<String, String> {
    // Make HTTP request to fetch the page
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (compatible; PDTodo/1.0)")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let html = response.text().await.map_err(|e| e.to_string())?;

    // Extract title from HTML using a simple regex-like approach
    // Look for <title>...</title>
    let title_start = html.to_lowercase().find("<title>");
    let title_end = html.to_lowercase().find("</title>");

    match (title_start, title_end) {
        (Some(start), Some(end)) if end > start => {
            let title_content = &html[start + 7..end];
            // Clean up the title (decode HTML entities, trim whitespace)
            let title = title_content
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&nbsp;", " ")
                .trim()
                .to_string();
            Ok(title)
        }
        _ => {
            // No title found, return the URL as fallback
            Ok(url)
        }
    }
}
