import * as Y from 'yjs';
import { encodeDocument, decodeDocument, mergeUpdates } from './document';

/**
 * Storage adapter interface for persisting Yjs documents
 */
export interface StorageAdapter {
  /** Load a document from storage */
  load(noteId: string): Promise<Uint8Array | null>;
  /** Save a document to storage */
  save(noteId: string, data: Uint8Array): Promise<void>;
  /** Delete a document from storage */
  delete(noteId: string): Promise<void>;
  /** List all stored note IDs */
  list(): Promise<string[]>;
  /** Save an incremental update */
  saveUpdate(noteId: string, update: Uint8Array): Promise<void>;
  /** Load all updates for a note */
  loadUpdates(noteId: string): Promise<Uint8Array[]>;
  /** Clear all updates after compaction */
  clearUpdates(noteId: string): Promise<void>;
}

/**
 * In-memory storage adapter for testing
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private documents: Map<string, Uint8Array> = new Map();
  private updates: Map<string, Uint8Array[]> = new Map();

  async load(noteId: string): Promise<Uint8Array | null> {
    return this.documents.get(noteId) ?? null;
  }

  async save(noteId: string, data: Uint8Array): Promise<void> {
    this.documents.set(noteId, data);
  }

  async delete(noteId: string): Promise<void> {
    this.documents.delete(noteId);
    this.updates.delete(noteId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.documents.keys());
  }

  async saveUpdate(noteId: string, update: Uint8Array): Promise<void> {
    const updates = this.updates.get(noteId) ?? [];
    updates.push(update);
    this.updates.set(noteId, updates);
  }

  async loadUpdates(noteId: string): Promise<Uint8Array[]> {
    return this.updates.get(noteId) ?? [];
  }

  async clearUpdates(noteId: string): Promise<void> {
    this.updates.delete(noteId);
  }
}

/**
 * Local storage manager for Yjs documents
 */
export class LocalStorage {
  private adapter: StorageAdapter;
  private documents: Map<string, Y.Doc> = new Map();
  private saveDebounce: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly DEBOUNCE_MS = 5000; // 5 seconds
  private readonly COMPACT_THRESHOLD = 100; // Number of updates before compaction

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  /**
   * Load or create a document
   */
  async getDocument(noteId: string): Promise<Y.Doc> {
    // Return cached document
    const cached = this.documents.get(noteId);
    if (cached) return cached;

    // Load from storage
    const doc = new Y.Doc();
    const savedData = await this.adapter.load(noteId);
    const updates = await this.adapter.loadUpdates(noteId);

    if (savedData) {
      Y.applyUpdate(doc, savedData);
    }

    // Apply any incremental updates
    for (const update of updates) {
      Y.applyUpdate(doc, update);
    }

    // Set up auto-save
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== 'persistence') {
        this.scheduleCompaction(noteId, doc, update);
      }
    });

    this.documents.set(noteId, doc);

    // Compact if there are many updates
    if (updates.length > this.COMPACT_THRESHOLD) {
      await this.compact(noteId, doc);
    }

    return doc;
  }

  /**
   * Schedule saving an update with debouncing
   */
  private async scheduleCompaction(noteId: string, doc: Y.Doc, update: Uint8Array): Promise<void> {
    // Save the update immediately
    await this.adapter.saveUpdate(noteId, update);

    // Debounce full document save
    const existing = this.saveDebounce.get(noteId);
    if (existing) {
      clearTimeout(existing);
    }

    this.saveDebounce.set(
      noteId,
      setTimeout(async () => {
        await this.compact(noteId, doc);
        this.saveDebounce.delete(noteId);
      }, this.DEBOUNCE_MS)
    );
  }

  /**
   * Compact updates into a single document state
   */
  async compact(noteId: string, doc: Y.Doc): Promise<void> {
    const state = encodeDocument(doc);
    await this.adapter.save(noteId, state);
    await this.adapter.clearUpdates(noteId);
  }

  /**
   * Create a new document
   */
  async createDocument(noteId: string): Promise<Y.Doc> {
    const doc = new Y.Doc();

    // Set up auto-save
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== 'persistence') {
        this.scheduleCompaction(noteId, doc, update);
      }
    });

    this.documents.set(noteId, doc);

    // Save initial state
    await this.adapter.save(noteId, encodeDocument(doc));

    return doc;
  }

  /**
   * Delete a document
   */
  async deleteDocument(noteId: string): Promise<void> {
    this.documents.delete(noteId);
    await this.adapter.delete(noteId);
  }

  /**
   * Force save all pending changes
   */
  async flush(): Promise<void> {
    for (const [noteId, timeout] of this.saveDebounce.entries()) {
      clearTimeout(timeout);
      const doc = this.documents.get(noteId);
      if (doc) {
        await this.compact(noteId, doc);
      }
    }
    this.saveDebounce.clear();
  }

  /**
   * List all stored note IDs
   */
  async listNotes(): Promise<string[]> {
    return this.adapter.list();
  }
}
