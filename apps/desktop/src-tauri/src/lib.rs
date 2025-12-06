mod commands;
mod logging;
mod storage;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize storage
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");

            let storage = storage::Storage::new(&app_data_dir)
                .expect("Failed to initialize storage");

            // Ensure the Scratch Pad note exists
            storage.ensure_scratch_pad().expect("Failed to ensure scratch pad");

            // Initialize logger
            let logger = logging::AppLogger::new(1000);
            logger.info("system", "Application started");

            app.manage(storage);
            app.manage(logger);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_notes,
            commands::get_note,
            commands::create_note,
            commands::update_note_title,
            commands::update_note_starred,
            commands::update_note_content,
            commands::delete_note,
            commands::restore_note,
            commands::permanently_delete_note,
            commands::duplicate_note,
            commands::search_notes,
            commands::fetch_url_title,
            commands::get_app_info,
            commands::get_logs,
            commands::get_logs_since,
            commands::add_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
