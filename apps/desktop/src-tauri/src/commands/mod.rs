use crate::storage::{NoteMeta, Note, Storage};
use tauri::State;

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
pub fn create_note(storage: State<Storage>, title: String) -> Result<String, String> {
    storage
        .create_note(&title)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_note_title(
    storage: State<Storage>,
    note_id: String,
    title: String,
) -> Result<(), String> {
    storage
        .update_note_title(&note_id, &title)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_note_starred(
    storage: State<Storage>,
    note_id: String,
    starred: bool,
) -> Result<(), String> {
    storage
        .update_note_starred(&note_id, starred)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_note_content(
    storage: State<Storage>,
    note_id: String,
    content: Vec<u8>,
) -> Result<(), String> {
    storage
        .update_note_content(&note_id, &content)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_note(storage: State<Storage>, note_id: String) -> Result<(), String> {
    storage
        .delete_note(&note_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn restore_note(storage: State<Storage>, note_id: String) -> Result<(), String> {
    storage
        .restore_note(&note_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn permanently_delete_note(storage: State<Storage>, note_id: String) -> Result<(), String> {
    storage
        .permanently_delete_note(&note_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn duplicate_note(storage: State<Storage>, note_id: String) -> Result<String, String> {
    storage
        .duplicate_note(&note_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_notes(storage: State<Storage>, query: String) -> Result<Vec<NoteMeta>, String> {
    storage
        .search_notes(&query)
        .map_err(|e| e.to_string())
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
