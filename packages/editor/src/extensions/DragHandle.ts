import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

const dragHandlePluginKey = new PluginKey('dragHandle');

interface DragHandleState {
  hoveredPos: number | null;
  isDragging: boolean;
  dropPos: number | null;
  draggedRange: { from: number; to: number } | null;
}

/**
 * Get the top-level block node at a given position
 */
function getBlockAtPos(doc: ProseMirrorNode, pos: number): { node: ProseMirrorNode; pos: number; depth: number } | null {
  if (pos < 0 || pos > doc.content.size) return null;

  const $pos = doc.resolve(pos);

  // Walk up from the resolved position to find a draggable block
  // We want to find nodes that are direct children of the document or list items
  for (let depth = $pos.depth; depth >= 1; depth--) {
    const node = $pos.node(depth);
    const parentNode = depth > 0 ? $pos.node(depth - 1) : null;

    // If parent is the doc or a list, this is our draggable block
    if (parentNode && (parentNode.type.name === 'doc' ||
        parentNode.type.name === 'bulletList' ||
        parentNode.type.name === 'orderedList' ||
        parentNode.type.name === 'taskList')) {
      return {
        node,
        pos: $pos.before(depth),
        depth,
      };
    }
  }

  // Fallback to depth 1 if we have any content
  if ($pos.depth >= 1) {
    return {
      node: $pos.node(1),
      pos: $pos.before(1),
      depth: 1,
    };
  }

  return null;
}

/**
 * Find block at Y coordinate by using posAtCoords
 */
function findBlockAtY(view: EditorView, x: number, y: number): { node: ProseMirrorNode; pos: number } | null {
  const editorRect = view.dom.getBoundingClientRect();

  // Use the actual X if within editor bounds, otherwise use left edge + offset
  let useX = x;
  if (x < editorRect.left) {
    useX = editorRect.left + 30; // Just inside the left edge
  } else if (x > editorRect.right) {
    useX = editorRect.right - 10;
  }

  // Try to get position at this coordinate
  const pos = view.posAtCoords({ left: useX, top: y });
  if (!pos) return null;

  // Use the existing getBlockAtPos function to find the block
  const block = getBlockAtPos(view.state.doc, pos.pos);
  if (!block) return null;

  return { node: block.node, pos: block.pos };
}

/**
 * Find the drop position from mouse coordinates
 */
function findDropPosition(view: EditorView, event: DragEvent): number | null {
  const coords = { left: event.clientX, top: event.clientY };
  const pos = view.posAtCoords(coords);

  if (!pos) return null;

  const $pos = view.state.doc.resolve(pos.pos);

  // Find the block-level position for dropping
  for (let depth = $pos.depth; depth >= 1; depth--) {
    const parentNode = depth > 0 ? $pos.node(depth - 1) : null;

    if (parentNode && (parentNode.type.name === 'doc' ||
        parentNode.type.name === 'bulletList' ||
        parentNode.type.name === 'orderedList' ||
        parentNode.type.name === 'taskList')) {
      const beforePos = $pos.before(depth);
      const afterPos = $pos.after(depth);
      const nodeStart = view.coordsAtPos(beforePos);
      const nodeEnd = view.coordsAtPos(afterPos);
      const middle = (nodeStart.top + nodeEnd.bottom) / 2;

      // Return before or after based on mouse position
      return coords.top < middle ? beforePos : afterPos;
    }
  }

  return pos.pos;
}

/**
 * Create decorations for the drag handle and drop indicator
 */
function createDecorations(state: DragHandleState, doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];

  // Add drag handle decoration on hover
  if (state.hoveredPos !== null && !state.isDragging) {
    const block = getBlockAtPos(doc, state.hoveredPos);
    if (block) {
      const handleWidget = document.createElement('div');
      handleWidget.className = 'drag-handle';
      handleWidget.setAttribute('draggable', 'true');
      handleWidget.setAttribute('data-drag-handle', 'true');
      // 2x2 grid with bigger, more spaced dots
      handleWidget.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="4" r="2"/>
          <circle cx="12" cy="4" r="2"/>
          <circle cx="4" cy="12" r="2"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      `;

      decorations.push(
        Decoration.widget(block.pos, handleWidget, {
          side: -1,
          key: `drag-handle-${block.pos}`,
        })
      );
    }
  }

  // Add dragging highlight
  if (state.isDragging && state.draggedRange) {
    decorations.push(
      Decoration.node(state.draggedRange.from, state.draggedRange.to, {
        class: 'is-dragging',
      })
    );
  }

  // Add drop indicator
  if (state.isDragging && state.dropPos !== null) {
    const indicatorWidget = document.createElement('div');
    indicatorWidget.className = 'drop-indicator';

    decorations.push(
      Decoration.widget(state.dropPos, indicatorWidget, {
        side: -1,
        key: `drop-indicator-${state.dropPos}`,
      })
    );
  }

  return DecorationSet.create(doc, decorations);
}

/**
 * DragHandle Extension for TipTap
 * Adds drag handles to all block elements for reordering content
 */
export const DragHandle = Extension.create({
  name: 'dragHandle',

  addProseMirrorPlugins() {
    let draggedNodeData: { from: number; to: number; content: ProseMirrorNode } | null = null;
    let editorContainer: HTMLElement | null = null;

    return [
      new Plugin({
        key: dragHandlePluginKey,

        state: {
          init(): DragHandleState {
            return {
              hoveredPos: null,
              isDragging: false,
              dropPos: null,
              draggedRange: null,
            };
          },

          apply(tr, value): DragHandleState {
            const meta = tr.getMeta(dragHandlePluginKey);
            if (meta) {
              return { ...value, ...meta };
            }

            // Map positions through the transaction if document changed
            if (tr.docChanged && value.hoveredPos !== null) {
              const newPos = tr.mapping.map(value.hoveredPos);
              return { ...value, hoveredPos: newPos };
            }

            return value;
          },
        },

        props: {
          decorations(state) {
            const pluginState = dragHandlePluginKey.getState(state);
            if (!pluginState) return DecorationSet.empty;
            return createDecorations(pluginState, state.doc);
          },

          handleDOMEvents: {
            mousemove(view, event) {
              // Store reference to editor container for boundary checks
              if (!editorContainer) {
                editorContainer = view.dom.closest('.editor-content-wrapper') as HTMLElement;
              }

              const state = dragHandlePluginKey.getState(view.state);

              // Check if we're within the editor's horizontal bounds (with extra left margin for drag handle)
              if (editorContainer) {
                const rect = editorContainer.getBoundingClientRect();
                const leftBound = rect.left - 40; // Allow 40px to the left for the drag handle
                const rightBound = rect.right;
                const topBound = rect.top;
                const bottomBound = rect.bottom;

                // If mouse is outside the editor area entirely, clear hover
                if (event.clientX < leftBound || event.clientX > rightBound ||
                    event.clientY < topBound || event.clientY > bottomBound) {
                  if (state?.hoveredPos !== null && !state?.isDragging) {
                    view.dispatch(
                      view.state.tr.setMeta(dragHandlePluginKey, { hoveredPos: null })
                    );
                  }
                  return false;
                }
              }

              // Find block at mouse position - uses actual X when in editor,
              // falls back to left edge when mouse is in the drag handle area
              const block = findBlockAtY(view, event.clientX, event.clientY);

              if (block && state?.hoveredPos !== block.pos) {
                view.dispatch(
                  view.state.tr.setMeta(dragHandlePluginKey, { hoveredPos: block.pos })
                );
              } else if (!block && state?.hoveredPos !== null && !state?.isDragging) {
                view.dispatch(
                  view.state.tr.setMeta(dragHandlePluginKey, { hoveredPos: null })
                );
              }

              return false;
            },

            mouseleave(view, event) {
              const relatedTarget = event.relatedTarget as HTMLElement | null;

              // Don't clear if moving to drag handle or staying within editor area
              if (relatedTarget?.closest('.drag-handle') ||
                  relatedTarget?.closest('.editor-content-wrapper')) {
                return false;
              }

              const state = dragHandlePluginKey.getState(view.state);
              if (state?.hoveredPos !== null && !state?.isDragging) {
                view.dispatch(
                  view.state.tr.setMeta(dragHandlePluginKey, { hoveredPos: null })
                );
              }
              return false;
            },

            dragstart(view, event) {
              const target = event.target as HTMLElement;

              // Only handle drag from our drag handle
              if (!target.closest('.drag-handle')) {
                return false;
              }

              const state = dragHandlePluginKey.getState(view.state);
              if (!state?.hoveredPos) return false;

              // Check if we have a selection that spans multiple blocks
              const { selection } = view.state;
              let from: number;
              let to: number;

              if (!selection.empty && !(selection instanceof NodeSelection)) {
                // Multi-line selection - drag the entire selection
                const $from = view.state.doc.resolve(selection.from);
                const $to = view.state.doc.resolve(selection.to);

                // Find the block boundaries
                from = selection.from;
                to = selection.to;

                for (let depth = $from.depth; depth >= 1; depth--) {
                  const parentNode = $from.node(depth - 1);
                  if (parentNode.type.name === 'doc' ||
                      parentNode.type.name === 'bulletList' ||
                      parentNode.type.name === 'orderedList' ||
                      parentNode.type.name === 'taskList') {
                    from = $from.before(depth);
                    break;
                  }
                }

                for (let depth = $to.depth; depth >= 1; depth--) {
                  const parentNode = $to.node(depth - 1);
                  if (parentNode.type.name === 'doc' ||
                      parentNode.type.name === 'bulletList' ||
                      parentNode.type.name === 'orderedList' ||
                      parentNode.type.name === 'taskList') {
                    to = $to.after(depth);
                    break;
                  }
                }
              } else {
                // Single block - drag the hovered block
                const block = getBlockAtPos(view.state.doc, state.hoveredPos);
                if (!block) return false;

                from = block.pos;
                to = block.pos + block.node.nodeSize;
              }

              // Store the dragged content
              const slice = view.state.doc.slice(from, to);
              draggedNodeData = {
                from,
                to,
                content: slice.content.firstChild!,
              };

              // Set drag image
              const dragImage = document.createElement('div');
              dragImage.className = 'drag-ghost';

              // Count blocks being dragged
              let blockCount = 0;
              view.state.doc.nodesBetween(from, to, (node, pos) => {
                if (pos >= from && pos < to) {
                  const $pos = view.state.doc.resolve(pos);
                  if ($pos.depth === 1 ||
                      ($pos.parent.type.name === 'bulletList' ||
                       $pos.parent.type.name === 'orderedList' ||
                       $pos.parent.type.name === 'taskList')) {
                    blockCount++;
                  }
                }
              });

              if (blockCount > 1) {
                dragImage.innerHTML = `
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" opacity="0.7">
                    <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  <span>${blockCount} items</span>
                `;
              } else {
                dragImage.innerHTML = `
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" opacity="0.7">
                    <circle cx="4" cy="4" r="2"/>
                    <circle cx="12" cy="4" r="2"/>
                    <circle cx="4" cy="12" r="2"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                `;
              }

              document.body.appendChild(dragImage);
              event.dataTransfer?.setDragImage(dragImage, 10, 10);

              // Clean up drag image after a moment
              setTimeout(() => dragImage.remove(), 0);

              // Set data transfer
              event.dataTransfer?.setData('text/plain', '');
              if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
              }

              // Update state to show dragging
              view.dispatch(
                view.state.tr.setMeta(dragHandlePluginKey, {
                  isDragging: true,
                  draggedRange: { from, to },
                })
              );

              return false;
            },

            dragover(view, event) {
              event.preventDefault();
              if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
              }

              const dropPos = findDropPosition(view, event);
              const state = dragHandlePluginKey.getState(view.state);

              if (state?.dropPos !== dropPos) {
                view.dispatch(
                  view.state.tr.setMeta(dragHandlePluginKey, { dropPos })
                );
              }

              return false;
            },

            dragleave(view, _event) {
              const state = dragHandlePluginKey.getState(view.state);
              if (state?.dropPos !== null) {
                view.dispatch(
                  view.state.tr.setMeta(dragHandlePluginKey, { dropPos: null })
                );
              }
              return false;
            },

            drop(view, event) {
              event.preventDefault();

              if (!draggedNodeData) return false;

              const dropPos = findDropPosition(view, event);
              if (dropPos === null) {
                draggedNodeData = null;
                return false;
              }

              const { from, to } = draggedNodeData;

              // Don't drop on itself
              if (dropPos >= from && dropPos <= to) {
                draggedNodeData = null;
                view.dispatch(
                  view.state.tr.setMeta(dragHandlePluginKey, {
                    isDragging: false,
                    dropPos: null,
                    draggedRange: null,
                  })
                );
                return false;
              }

              // Get the content to move
              const slice = view.state.doc.slice(from, to);

              // Calculate the adjusted drop position after deletion
              let adjustedDropPos = dropPos;
              if (dropPos > from) {
                adjustedDropPos = dropPos - (to - from);
              }

              // Create transaction to move content
              const tr = view.state.tr;

              // Delete from original position
              tr.delete(from, to);

              // Insert at new position
              tr.insert(adjustedDropPos, slice.content);

              // Reset state
              tr.setMeta(dragHandlePluginKey, {
                isDragging: false,
                dropPos: null,
                draggedRange: null,
                hoveredPos: null,
              });

              view.dispatch(tr);
              draggedNodeData = null;

              return true;
            },

            dragend(view, _event) {
              draggedNodeData = null;

              view.dispatch(
                view.state.tr.setMeta(dragHandlePluginKey, {
                  isDragging: false,
                  dropPos: null,
                  draggedRange: null,
                })
              );

              return false;
            },
          },
        },
      }),
    ];
  },
});
