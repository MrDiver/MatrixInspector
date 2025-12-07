<script>
  import { onMount } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { python } from '@codemirror/lang-python';
  import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
  import { keymap } from '@codemirror/view';

  export let code = '';
  export let errorLines = [];

  let editorContainer;
  let view;
  let editorState;
  let errorMap = new Map();
  let cleanupWindowHandler = null;

  const pythonVariables = ['S_left', 'K', 'S_right', 'KS', 'O_py', 'O', 'print'];

  // Custom autocomplete for Python variables
  function pythonCompletion(context) {
    const word = context.matchBefore(/\w*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    return {
      from: word.from,
      options: pythonVariables.map(variable => ({
        label: variable,
        type: 'variable'
      }))
    };
  }

  // Error decoration for marking lines with errors
  function createErrorDecorations(errors) {
    if (!view) return;

    // Parse errors to get line numbers
    errorMap.clear();

    // Join all error lines to process the full traceback
    const fullError = errors.join('\n');

    // Collect all line number matches; prefer the deepest one
    const matches = [...fullError.matchAll(/[Ll]ine\s+(\d+)/g)];
    const lineNum = matches.length > 0 ? parseInt(matches[matches.length - 1][1]) : 1;

    // Extract just the error message (the line with ErrorType: message)
    // Split by newlines and find the actual error line (not <exec> or File lines)
    const lines = fullError.split('\n');
    let errorMessage = fullError.trim();

    // Work backwards to find the first line that looks like "ErrorType: message"
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      // Match pattern like "NameError: name 'x' is not defined"
      if (line && /^[A-Za-z]+Error.*:/.test(line)) {
        errorMessage = line;
        break;
      }
    }

    // Only set a marker if we have a message
    if (errorMessage) {
      if (!errorMap.has(lineNum)) {
        errorMap.set(lineNum, []);
      }
      errorMap.get(lineNum).push(errorMessage);
    }

    updateErrorMarkers();
  }

  function updateErrorMarkers() {
    if (!view) return;

    // Clear existing error classes
    editorContainer?.querySelectorAll('.cm-error-line').forEach(el => {
      el.classList.remove('cm-error-line');
      el.removeAttribute('title');
    });

    // Mark lines with errors and add tooltips
    errorMap.forEach((messages, lineNum) => {
      // Get total line count
      const totalLines = view.state.doc.lines;
      
      if (lineNum > 0 && lineNum <= totalLines) {
        const lineElements = editorContainer?.querySelectorAll(`.cm-line`);
        
        if (lineElements && lineNum - 1 < lineElements.length) {
          const lineElement = lineElements[lineNum - 1];
          lineElement.classList.add('cm-error-line');
          lineElement.title = messages.join('\n');
        }
      }
    });
  }

  onMount(() => {
    if (!editorContainer) return;

    editorState = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        python(),
        autocompletion({
          override: [pythonCompletion]
        }),
        // Prevent browser defaults for Ctrl/Cmd+P (print) and Ctrl/Cmd+Enter (newline)
        EditorView.domEventHandlers({
          keydown(event) {
            const isMod = event.ctrlKey || event.metaKey;
            if (isMod && (event.key === 'p' || event.key === 'P')) {
              event.preventDefault();
              return false;
            }
            if (isMod && event.key === 'Enter') {
              event.preventDefault();
              return false;
            }
          }
        }),
        keymap.of(completionKeymap),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            code = update.state.doc.toString();
          }
        })
      ]
    });

    view = new EditorView({
      state: editorState,
      parent: editorContainer
    });

    // Capture-phase listener to block browser defaults when editor is focused
    const windowKeydown = (event) => {
      const isMod = event.ctrlKey || event.metaKey;
      const targetInsideEditor = editorContainer && editorContainer.contains(event.target);
      if (!targetInsideEditor) return;
      if (isMod && (event.key === 'p' || event.key === 'P')) {
        event.preventDefault();
        return;
      }
      if (isMod && event.key === 'Enter') {
        event.preventDefault();
        return;
      }
    };
    window.addEventListener('keydown', windowKeydown, { capture: true });
    cleanupWindowHandler = () => window.removeEventListener('keydown', windowKeydown, { capture: true });

    return () => {
      if (cleanupWindowHandler) cleanupWindowHandler();
      view.destroy();
    };
  });

  // Reactive: update error decorations when errorLines changes
  $: if (view && errorLines && errorLines.length > 0) {
    createErrorDecorations(errorLines);
  } else if (view && errorLines && errorLines.length === 0) {
    errorMap.clear();
    // Clear any existing error line classes
    editorContainer?.querySelectorAll('.cm-error-line').forEach(el => {
      el.classList.remove('cm-error-line');
      el.removeAttribute('title');
    });
  }
</script>

<div class="cm-wrapper" bind:this={editorContainer}></div>

<style>
  :global(.cm-editor) {
    height: 100%;
    width: 100%;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  :global(.cm-content) {
    padding: 12px;
    line-height: 1.5;
    color: var(--text-primary);
  }

  :global(.cm-gutters) {
    background: var(--bg-tertiary);
    border-right: 1px solid var(--border-color);
  }

  :global(.cm-activeLineGutter) {
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  :global(.cm-error-line) {
    background: rgba(250, 112, 154, 0.1) !important;
    border-left: 3px solid #fa709a;
    padding-left: 9px;
  }

  :global(.cm-error-line:hover) {
    background: rgba(250, 112, 154, 0.15) !important;
    cursor: help;
  }

  :global(.cm-completionLabel) {
    font-family: inherit;
  }

  :global(.cm-tooltip) {
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    font-size: 12px;
  }

  :global(.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]) {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .cm-wrapper {
    width: 100%;
    height: 100%;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  :global(.cm-wrapper .cm-editor) {
    flex: 1;
    height: auto;
  }

  :global(.cm-wrapper .cm-scroller) {
    overflow: auto;
  }
</style>
