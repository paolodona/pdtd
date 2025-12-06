import TaskItem from '@tiptap/extension-task-item';
import { TextSelection } from '@tiptap/pm/state';

/**
 * Extended TaskItem with strikethrough styling for completed tasks
 * and proper Enter key behavior (creates new task item instead of paragraph)
 */
export const TaskItemExtended = TaskItem.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      checked: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-checked') === 'true',
        renderHTML: (attributes) => ({
          'data-checked': attributes.checked,
        }),
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Enter creates a new task item instead of a paragraph inside the current item
      'Enter': () => {
        return this.editor.commands.splitListItem('taskItem');
      },
      // Backspace: handle joining list items without creating extra paragraphs
      'Backspace': () => {
        const { state, view } = this.editor;
        const { selection, doc, tr } = state;
        const { $from, empty } = selection;

        // Only handle if cursor is at the very start of text content
        if (!empty) return false;

        // Check if we're in a taskItem
        let taskItemDepth = -1;
        for (let depth = $from.depth; depth > 0; depth--) {
          if ($from.node(depth).type.name === 'taskItem') {
            taskItemDepth = depth;
            break;
          }
        }

        if (taskItemDepth === -1) return false;

        // Check if cursor is at the start of the taskItem's content
        const taskItemStart = $from.start(taskItemDepth);
        const taskItemNode = $from.node(taskItemDepth);

        // Get the position relative to the taskItem content
        // taskItem structure: <taskItem><paragraph>text</paragraph></taskItem>
        // We need to check if we're at the very beginning of the text
        const relativePos = $from.pos - taskItemStart;

        // If we're at the start of the content (position 0 or 1 depending on paragraph)
        if (relativePos <= 1) {
          // Find our position in the parent list
          const taskItemPos = $from.before(taskItemDepth);
          const $taskItemPos = doc.resolve(taskItemPos);
          const indexInParent = $taskItemPos.index($taskItemPos.depth);

          // Check if this taskItem is empty
          const textContent = taskItemNode.textContent;

          if (textContent.length === 0) {
            // Empty taskItem
            if (indexInParent === 0) {
              // First item: lift out of list
              return this.editor.commands.liftListItem('taskItem');
            }

            // Not first item: delete this empty item and place cursor at end of previous
            const prevItemEnd = taskItemPos - 1;
            const $prevEnd = doc.resolve(prevItemEnd);

            // Find the text position at the end of the previous taskItem's content
            let prevTaskItemDepth = -1;
            for (let depth = $prevEnd.depth; depth > 0; depth--) {
              if ($prevEnd.node(depth).type.name === 'taskItem') {
                prevTaskItemDepth = depth;
                break;
              }
            }

            if (prevTaskItemDepth > 0) {
              const prevTaskItemEnd = $prevEnd.end(prevTaskItemDepth);
              // Delete the current empty taskItem
              const taskItemEnd = $from.after(taskItemDepth);

              const transaction = tr.delete(taskItemPos, taskItemEnd);
              const newPos = Math.min(prevTaskItemEnd - 1, transaction.doc.content.size - 1);
              transaction.setSelection(TextSelection.near(transaction.doc.resolve(newPos)));

              view.dispatch(transaction);
              return true;
            }
          } else {
            // Non-empty taskItem at cursor start
            if (indexInParent === 0) {
              // First item in list: lift out
              return this.editor.commands.liftListItem('taskItem');
            }
            // Not first item: let default behavior handle text joining
            return false;
          }
        }

        return false;
      },
      // Tab indents the task item
      'Tab': () => {
        return this.editor.commands.sinkListItem('taskItem');
      },
      // Shift+Tab outdents the task item
      'Shift-Tab': () => {
        return this.editor.commands.liftListItem('taskItem');
      },
      // Mod+Enter toggles the checkbox
      'Mod-Enter': () => {
        // Toggle checkbox on current task item
        const { state, dispatch } = this.editor.view;
        const { selection } = state;
        const pos = selection.$head;

        // Find the parent task item node
        for (let depth = pos.depth; depth > 0; depth--) {
          const node = pos.node(depth);
          if (node.type.name === 'taskItem') {
            const nodePos = pos.before(depth);
            const tr = state.tr.setNodeMarkup(nodePos, undefined, {
              ...node.attrs,
              checked: !node.attrs.checked,
            });
            dispatch(tr);
            return true;
          }
        }

        return false;
      },
    };
  },
});
