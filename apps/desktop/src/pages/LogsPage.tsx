import { Component, createSignal, For, onMount, onCleanup } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import './LogsPage.css';

interface LogEntry {
  timestamp: number;
  level: string;
  category: string;
  message: string;
}

export const LogsPage: Component = () => {
  const [logs, setLogs] = createSignal<LogEntry[]>([]);
  const [isPolling, setIsPolling] = createSignal(true);
  let containerRef: HTMLDivElement | undefined;
  let intervalId: number | undefined;

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
  };

  const fetchLogs = async () => {
    try {
      const entries = await invoke<LogEntry[]>('get_logs');
      setLogs(entries);
      // Auto-scroll to bottom
      if (containerRef) {
        containerRef.scrollTop = containerRef.scrollHeight;
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const togglePolling = () => {
    setIsPolling(!isPolling());
    if (isPolling()) {
      startPolling();
    } else {
      stopPolling();
    }
  };

  const startPolling = () => {
    fetchLogs();
    intervalId = window.setInterval(fetchLogs, 500);
  };

  const stopPolling = () => {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  const clearDisplay = () => {
    setLogs([]);
  };

  onMount(() => {
    startPolling();
  });

  onCleanup(() => {
    stopPolling();
  });

  return (
    <div class="logs-page">
      <header class="logs-header">
        <div class="logs-header-left">
          <h1 class="logs-title">Application Logs</h1>
          <span class="logs-count">{logs().length} entries</span>
        </div>
        <div class="logs-header-right">
          <button
            class="logs-btn"
            classList={{ active: isPolling() }}
            onClick={togglePolling}
          >
            {isPolling() ? 'Pause' : 'Resume'}
          </button>
          <button class="logs-btn" onClick={clearDisplay}>
            Clear
          </button>
        </div>
      </header>
      <div class="logs-container" ref={containerRef}>
        <For each={logs()} fallback={
          <div class="logs-empty">No logs yet. Activity will appear here.</div>
        }>
          {(entry) => (
            <div class={`log-entry log-${entry.level}`}>
              <span class="log-time">{formatTime(entry.timestamp)}</span>
              <span class={`log-level log-level-${entry.level}`}>{entry.level.toUpperCase()}</span>
              <span class="log-category">[{entry.category}]</span>
              <span class="log-message">{entry.message}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
