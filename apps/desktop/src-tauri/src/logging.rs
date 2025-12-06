use serde::Serialize;
use std::collections::VecDeque;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize)]
pub struct LogEntry {
    pub timestamp: i64,
    pub level: String,
    pub category: String,
    pub message: String,
}

pub struct AppLogger {
    entries: Mutex<VecDeque<LogEntry>>,
    max_entries: usize,
}

impl AppLogger {
    pub fn new(max_entries: usize) -> Self {
        Self {
            entries: Mutex::new(VecDeque::with_capacity(max_entries)),
            max_entries,
        }
    }

    pub fn log(&self, level: &str, category: &str, message: &str) {
        let entry = LogEntry {
            timestamp: chrono::Utc::now().timestamp_millis(),
            level: level.to_string(),
            category: category.to_string(),
            message: message.to_string(),
        };

        let mut entries = self.entries.lock().unwrap();
        if entries.len() >= self.max_entries {
            entries.pop_front();
        }
        entries.push_back(entry);
    }

    pub fn info(&self, category: &str, message: &str) {
        self.log("info", category, message);
    }

    pub fn warn(&self, category: &str, message: &str) {
        self.log("warn", category, message);
    }

    pub fn error(&self, category: &str, message: &str) {
        self.log("error", category, message);
    }

    pub fn get_entries(&self) -> Vec<LogEntry> {
        self.entries.lock().unwrap().iter().cloned().collect()
    }

    pub fn get_entries_since(&self, since_timestamp: i64) -> Vec<LogEntry> {
        self.entries
            .lock()
            .unwrap()
            .iter()
            .filter(|e| e.timestamp > since_timestamp)
            .cloned()
            .collect()
    }
}
