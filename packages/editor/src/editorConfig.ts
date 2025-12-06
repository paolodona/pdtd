import { Extension } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Underline from '@tiptap/extension-underline';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import TaskList from '@tiptap/extension-task-list';
import History from '@tiptap/extension-history';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { TaskItemExtended } from './extensions/TaskItemExtended';

/**
 * Get all extensions for the TipTap editor
 */
export function getEditorExtensions(options?: { placeholder?: string }) {
  return [
    Document,
    Paragraph,
    Text,
    Bold,
    Underline,
    Heading.configure({
      levels: [1, 2, 3],
    }),
    BulletList,
    OrderedList,
    ListItem.extend({
      addKeyboardShortcuts() {
        return {
          Tab: () => this.editor.commands.sinkListItem('listItem'),
          'Shift-Tab': () => this.editor.commands.liftListItem('listItem'),
        };
      },
    }),
    TaskList,
    TaskItemExtended.configure({
      nested: true,
    }),
    Link.configure({
      openOnClick: false,  // We handle click separately to open in external browser
      autolink: true,      // Auto-detect URLs while typing
      linkOnPaste: true,   // Auto-link pasted URLs
      HTMLAttributes: {
        rel: 'noopener noreferrer nofollow',
        target: null,
      },
    }),
    History,
    Placeholder.configure({
      placeholder: options?.placeholder ?? 'Start typing...',
    }),
    // Custom keyboard shortcuts extension
    Extension.create({
      name: 'customKeyboardShortcuts',
      addKeyboardShortcuts() {
        return {
          'Mod-1': () => this.editor.commands.toggleHeading({ level: 1 }),
          'Mod-2': () => this.editor.commands.toggleHeading({ level: 2 }),
          'Mod-3': () => this.editor.commands.toggleHeading({ level: 3 }),
          'Mod-Shift-7': () => this.editor.commands.toggleOrderedList(),
          'Mod-Shift-8': () => this.editor.commands.toggleBulletList(),
          'Mod-Shift-9': () => this.editor.commands.toggleTaskList(),
        };
      },
    }),
  ];
}

/**
 * Editor styles for the TipTap editor
 */
export const editorStyles = `
  .ProseMirror {
    outline: none;
    min-height: 100%;
    padding: 1rem;
  }

  .ProseMirror p {
    margin: 0 0 6px 0;
  }

  .ProseMirror h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 1rem 0 0.5rem;
  }

  .ProseMirror h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0.875rem 0 0.5rem;
  }

  .ProseMirror h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0.75rem 0 0.5rem;
  }

  .ProseMirror ul,
  .ProseMirror ol {
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }

  .ProseMirror li {
    margin: 0.25rem 0;
  }

  .ProseMirror ul[data-type="taskList"] {
    list-style: none;
    padding-left: 0;
    margin: 0;
  }

  .ProseMirror ul[data-type="taskList"] li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 3px;
    min-height: 22px;
  }

  .ProseMirror ul[data-type="taskList"] li > label {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    margin-top: 3px;
    height: 16px;
    width: 16px;
  }

  .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    margin: 0;
    appearance: none;
    -webkit-appearance: none;
    background: #1a1b1e;
    border: 1.5px solid var(--text-muted, #6B7280);
    border-radius: 3px;
    position: relative;
    transition: background-color 0.15s, border-color 0.15s;
  }

  .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:hover {
    border-color: var(--accent-success, #22C55E);
    background: #222326;
  }

  .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
    background: var(--accent-success, #22C55E);
    border-color: var(--accent-success, #22C55E);
  }

  .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 4px;
    height: 8px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: translate(-50%, -60%) rotate(45deg);
  }

  .ProseMirror ul[data-type="taskList"] li > div {
    flex: 1;
    line-height: 1.4;
  }

  .ProseMirror ul[data-type="taskList"] li > div p {
    margin: 0;
  }

  /* Strikethrough for completed tasks */
  .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  /* Nested task lists */
  .ProseMirror ul[data-type="taskList"] ul[data-type="taskList"] {
    margin-left: 0;
    margin-top: 6px;
  }

  .ProseMirror p.is-editor-empty:first-child::before {
    color: var(--text-muted);
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  .ProseMirror strong {
    font-weight: 700;
  }

  .ProseMirror u {
    text-decoration: underline;
  }
`;
