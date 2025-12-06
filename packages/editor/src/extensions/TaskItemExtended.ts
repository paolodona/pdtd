import TaskItem from '@tiptap/extension-task-item';

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
