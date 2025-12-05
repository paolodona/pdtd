import * as Y from 'yjs';
import { yXmlFragmentToProseMirrorRootNode, prosemirrorToYXmlFragment } from 'y-prosemirror';
import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';

/**
 * Create a new Yjs document for a note
 */
export function createNoteDocument(): Y.Doc {
  const doc = new Y.Doc();
  return doc;
}

/**
 * Get the content XmlFragment from a Yjs document
 */
export function getContentFragment(doc: Y.Doc): Y.XmlFragment {
  return doc.getXmlFragment('content');
}

/**
 * Get the metadata Map from a Yjs document
 */
export function getMetaMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap('meta');
}

/**
 * Set note title in the document metadata
 */
export function setNoteTitle(doc: Y.Doc, title: string): void {
  const meta = getMetaMap(doc);
  meta.set('title', title);
}

/**
 * Get note title from the document metadata
 */
export function getNoteTitle(doc: Y.Doc): string {
  const meta = getMetaMap(doc);
  return (meta.get('title') as string) ?? '';
}

/**
 * Set starred status in the document metadata
 */
export function setNoteStarred(doc: Y.Doc, starred: boolean): void {
  const meta = getMetaMap(doc);
  meta.set('starred', starred);
}

/**
 * Get starred status from the document metadata
 */
export function getNoteStarred(doc: Y.Doc): boolean {
  const meta = getMetaMap(doc);
  return (meta.get('starred') as boolean) ?? false;
}

/**
 * Serialize a Yjs document to a Uint8Array
 */
export function encodeDocument(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

/**
 * Deserialize a Uint8Array into a Yjs document
 */
export function decodeDocument(data: Uint8Array): Y.Doc {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, data);
  return doc;
}

/**
 * Get the state vector of a document (for sync)
 */
export function getStateVector(doc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(doc);
}

/**
 * Encode a state vector as a Uint8Array
 */
export function encodeStateVector(doc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(doc);
}

/**
 * Get missing updates between two documents
 */
export function getMissingUpdates(doc: Y.Doc, remoteStateVector: Uint8Array): Uint8Array {
  return Y.encodeStateAsUpdate(doc, remoteStateVector);
}

/**
 * Apply an update to a document
 */
export function applyUpdate(doc: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(doc, update);
}

/**
 * Merge multiple updates into a single update
 */
export function mergeUpdates(updates: Uint8Array[]): Uint8Array {
  return Y.mergeUpdates(updates);
}

/**
 * Convert ProseMirror node to Yjs content
 */
export function setProseMirrorContent(
  doc: Y.Doc,
  node: ProseMirrorNode,
  schema: Schema
): void {
  const fragment = getContentFragment(doc);
  prosemirrorToYXmlFragment(node, fragment);
}

/**
 * Convert Yjs content to ProseMirror node
 */
export function getProseMirrorContent(doc: Y.Doc, schema: Schema): ProseMirrorNode | null {
  const fragment = getContentFragment(doc);
  try {
    return yXmlFragmentToProseMirrorRootNode(fragment, schema);
  } catch {
    return null;
  }
}
