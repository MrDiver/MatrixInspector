<script>
  import { onMount, onDestroy } from 'svelte';
  import { initPyodide, executePython, isPyodideReady } from './pythonService';
  import { graph, rows, cols } from './stores';
  import PythonCodeEditor from './PythonCodeEditor.svelte';

  /** @type {import('./dependencyGraph').DependencyGraph | null} */
  let typedGraph = null;
  
  export let isOpen = false;
  export let pythonResult = null;
  
  let code = `# Compute O_py = S_left @ K @ S_right
# The TrackedMatrix class tracks dependencies automatically

KS = S_left @ K
O_py = KS @ S_right

# You can inspect the result
print(f"O_py shape: {O_py.rows}x{O_py.cols}")
O_py  # Return the result
`;
  
  let output = '';
  let error = '';
  let stdoutLog = '';
  let stderrLog = '';
  let errorLines = [];
  let isLoading = false;
  let pyodideReady = false;
  
  onMount(async () => {
    // Initialize Pyodide in background
    try {
      await initPyodide();
      pyodideReady = true;
    } catch (err) {
      error = 'Failed to load Python runtime: ' + err.message;
    }
    
    // Add keyboard shortcut (Ctrl+P or Cmd+P)
    window.addEventListener('keydown', handleKeydown);
  });
  
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
  
  function handleKeydown(e) {
    // Ctrl/Cmd + P to toggle panel
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      isOpen = !isOpen;
    }
    
    // Ctrl/Cmd + Enter to run code (when panel is open)
    if (isOpen && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }
  }
  
  async function runCode() {
    if (!pyodideReady) {
      error = 'Python runtime is still loading...';
      return;
    }
    
    isLoading = true;
    output = '';
    error = '';
    stdoutLog = '';
    stderrLog = '';
    errorLines = [];
    pythonResult = null;
    
    try {
      // Get current matrix data
      const matrices = getMatrixData();
      
      // Execute Python code
      const result = await executePython(code, matrices);
      
      if (result.success) {
        output = result.output ? String(result.output) : 'Code executed successfully';
        pythonResult = result.O_py;
        stdoutLog = result.stdout || '';
        stderrLog = result.stderr || '';
        errorLines = [];
      } else {
        error = result.error;
        stdoutLog = result.stdout || '';
        stderrLog = result.stderr || '';
        // Parse stderr for error lines
        const stderrLines = (result.stderr || '').split('\n');
        errorLines = stderrLines.filter(line => line.trim().length > 0);
      }
    } catch (err) {
      error = err.message;
    } finally {
      isLoading = false;
    }
  }
  
  function getMatrixData() {
    let currentRows = 0;
    let currentCols = 0;
    
    graph.subscribe(g => typedGraph = g)();
    rows.subscribe(r => currentRows = r)();
    cols.subscribe(c => currentCols = c)();
    
    if (!typedGraph || !currentRows || !currentCols) {
      return {
        S_left: { data: [], rows: 0, cols: 0 },
        K: { data: [], rows: 0, cols: 0 },
        S_right: { data: [], rows: 0, cols: 0 }
      };
    }
    /** @type {import('./dependencyGraph').DependencyGraph} */
    const gref = typedGraph;

    const matrices = {
      S_left: { data: [], rows: currentRows, cols: currentCols },
      K: { data: [], rows: currentCols, cols: currentRows },
      S_right: { data: [], rows: currentRows, cols: currentCols }
    };
    
    // Extract S_left
    for (let i = 0; i < currentRows; i++) {
      const row = [];
      for (let j = 0; j < currentCols; j++) {
        const elem = gref.getElementAt('S_left', i, j);
        row.push(elem ? elem.value : 0);
      }
      matrices.S_left.data.push(row);
    }
    
    // Extract K
    for (let i = 0; i < currentCols; i++) {
      const row = [];
      for (let j = 0; j < currentRows; j++) {
        const elem = gref.getElementAt('K', i, j);
        row.push(elem ? elem.value : 0);
      }
      matrices.K.data.push(row);
    }
    
    // Extract S_right
    for (let i = 0; i < currentRows; i++) {
      const row = [];
      for (let j = 0; j < currentCols; j++) {
        const elem = gref.getElementAt('S_right', i, j);
        row.push(elem ? elem.value : 0);
      }
      matrices.S_right.data.push(row);
    }
    
    return matrices;
  }
  
  function clearOutput() {
    output = '';
    error = '';
    stdoutLog = '';
    stderrLog = '';
    errorLines = [];
    pythonResult = null;
  }

  function handleOverlayKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      isOpen = false;
    }
  }
</script>

<div class="python-shell" class:open={isOpen}>
  <div class="grid-stack">
    <div class="floating-grid">
      <div class="editor-wrapper">
        <div class="float-card editor-card" class:active={isOpen}>
        <div class="card-header">
          <div class="title">
            <span class="icon">🐍</span>
            <div class="title-text">
              <div class="main">Python Matrix Inspector</div>
              <div class="sub">S_left @ K @ S_right</div>
            </div>
            {#if !pyodideReady}
              <span class="loading-badge">Loading...</span>
            {/if}
            {#if isLoading}
              <span class="pulsing-dot" aria-hidden="true"></span>
            {/if}
          </div>
          <div class="header-actions">
            <button on:click={() => isOpen = false} class="icon-btn close" title="Close (Ctrl+P)">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div class="editor-body">
          <div class="section-label">Python Code</div>
          <PythonCodeEditor bind:code {errorLines} />
          <div class="help-text">
            💡 Available: <code>S_left</code>, <code>K</code>, <code>S_right</code> (TrackedMatrix objects)
            <br>
            Use <code>@</code> for matrix multiplication. Assign result to <code>O_py</code> to display it.
          </div>
        </div>
      </div>
    </div>

    <div class="float-card stdout-card" class:active={isOpen}>
      <div class="card-header compact">
        <div class="section-label inline">Stdout / Result</div>
        {#if isLoading}
          <div class="mini-spinner" aria-hidden="true"></div>
        {/if}
      </div>
      <div class="stdout-body">
        {#if isLoading}
          <div class="output loading">
            <div class="spinner"></div>
            Executing...
          </div>
        {:else if output}
          <div class="output success">{output}</div>
        {:else if error}
          <div class="output empty">No stdout yet.</div>
        {:else}
          <div class="output empty">No output yet. Click "Run" to execute your code.</div>
        {/if}
        <div class="log-card">
          <div class="log-title">stdout</div>
          <pre class="log-content">{stdoutLog || '—'}</pre>
        </div>
      </div>
    </div>

    <div class="float-card stderr-card" class:active={isOpen}>
      <div class="card-header compact">
        <div class="section-label inline">Stderr</div>
      </div>
      <div class="stderr-body">
        {#if error}
          <div class="error-callout">
            <strong>Error:</strong> {error}
          </div>
        {/if}
        <div class="log-card error-log">
          <div class="log-title">stderr</div>
          <pre class="log-content">{stderrLog || (error ? '' : '—')}</pre>
        </div>
      </div>
    </div>

    </div> <!-- end floating-grid -->

    <div class="floating-toolbar" class:active={isOpen}>
      <button on:click={runCode} disabled={!pyodideReady || isLoading} class="icon-btn run" title="Run (Ctrl+Enter)">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
        </svg>
      </button>
      <button on:click={clearOutput} class="icon-btn clear" title="Clear output">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M9 4h6m-8 4h10l-1 10H8L7 8Zm2 0V4h4v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div> <!-- end grid-stack -->
</div>

{#if isOpen}
  <div
    class="overlay"
    role="button"
    tabindex="0"
    aria-label="Close Python panel"
    on:click={() => isOpen = false}
    on:keydown={handleOverlayKeydown}
  ></div>
{/if}

<style>
  .python-shell {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1000;
  }

  .python-shell.open {
    pointer-events: auto;
  }

  .grid-stack {
    position: absolute;
    inset: 0;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999;
    animation: fadeIn 0.3s;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .floating-grid {
    position: absolute;
    top: 2vh;
    left: 50%;
    transform: translateX(-50%) scale(0.98);
    width: min(1200px, 94vw);
    max-height: 96vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: 1fr;
    gap: 16px;
    opacity: 0;
    transition: opacity 0.25s ease, transform 0.25s ease;
  }

  .python-shell.open .floating-grid {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }

  .floating-toolbar {
    position: absolute;
    top: 2vh;
    right: calc(50% - min(1200px, 94vw)/2 - 88px);
    height: 240px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
    background: rgba(17, 24, 39, 0.78);
    padding: 16px 12px;
    border-radius: 12px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(8px);
    transform: translateX(72px) scale(0.96);
    opacity: 0;
    pointer-events: auto;
    transition: transform 0.32s ease, opacity 0.32s ease;
  }

  .python-shell.open .floating-toolbar {
    transform: translateX(0) scale(1);
    opacity: 1;
  }

  .editor-wrapper {
    position: relative;
    grid-column: 1 / 3;
  }

  .float-card {
    position: relative;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    box-shadow: 0 12px 36px rgba(17, 24, 39, 0.18);
    padding: 16px;
    overflow: hidden;
    opacity: 0;
    display: flex;
    flex-direction: column;
  }

  .editor-card {
    min-height: 560px;
    padding-right: 24px;
    transform: translateY(-200px) scale(0.96);
  }

  .stdout-card {
    min-height: 280px;
    transform: translate(-160px, 140px) scale(0.95);
    flex-direction: column;
  }

  .stderr-card {
    min-height: 280px;
    transform: translate(160px, 140px) scale(0.95);
  }

  .python-shell.open .editor-card {
    animation: slideIn 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }

  .python-shell.open .stdout-card {
    animation: slideInLeft 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    animation-delay: 80ms;
  }

  .python-shell.open .stderr-card {
    animation: slideInRight 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    animation-delay: 160ms;
  }

  @keyframes slideIn {
    0% { transform: translateY(-180px) scale(0.95); opacity: 0; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }

  @keyframes slideInLeft {
    0% { transform: translate(-200px, 140px) scale(0.94); opacity: 0; }
    100% { transform: translate(0, 0) scale(1); opacity: 1; }
  }

  @keyframes slideInRight {
    0% { transform: translate(200px, 140px) scale(0.94); opacity: 0; }
    100% { transform: translate(0, 0) scale(1); opacity: 1; }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .card-header.compact {
    margin-bottom: 8px;
  }

  .title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .icon {
    font-size: 22px;
  }

  .title-text .main {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .title-text .sub {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .loading-badge {
    font-size: 11px;
    background: #667eea;
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    margin-left: 6px;
  }

  .pulsing-dot {
    width: 10px;
    height: 10px;
    background: #10b981;
    border-radius: 999px;
    margin-left: 8px;
    animation: pulse 1.1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.25); opacity: 1; }
  }


  .icon-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s;
    background: var(--button-primary);
  }

  .icon-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .icon-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }

  .icon-btn.run {
    background: #43e97b;
  }

  .icon-btn.clear {
    background: #fa709a;
  }

  .icon-btn.close {
    width: 32px;
    height: 32px;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    box-shadow: none;
  }

  .header-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .editor-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    overflow: hidden;
  }

  .section-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .section-label.inline {
    margin: 0;
  }

  .help-text {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
    flex-shrink: 0;
  }

  .help-text code {
    background: var(--bg-tertiary);
    padding: 2px 4px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 11px;
    color: var(--text-primary);
  }

  .stdout-body, .stderr-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .output {
    padding: 12px;
    border-radius: 10px;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    min-height: 64px;
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    background: var(--bg-secondary);
  }

  .output.empty {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-style: dashed;
  }

  .output.success {
    background: rgba(67, 233, 123, 0.1);
    border-color: #43e97b;
    color: #43e97b;
  }

  .output.loading {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    background: var(--bg-secondary);
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border-color);
    border-top-color: var(--button-primary);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .mini-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border-color);
    border-top-color: #43e97b;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .log-card {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 120px;
  }

  .log-card.error-log {
    border-color: #fa709a;
    background: rgba(250, 112, 154, 0.1);
  }

  .log-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .log-content {
    flex: 1;
    margin: 0;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-primary);
  }

  .error-callout {
    padding: 10px;
    border-radius: 10px;
    background: rgba(250, 112, 154, 0.1);
    border: 1px solid #fa709a;
    color: #fa709a;
    font-size: 13px;
  }

  @media (max-width: 920px) {
    .floating-grid {
      width: 94vw;
      right: 3vw;
      top: 4vh;
    }
  }

  @media (max-width: 760px) {
    .floating-grid {
      grid-template-columns: 1fr;
    }
    .editor-card {
      grid-column: 1 / 2;
      min-height: 280px;
      padding-right: 54px;
    }
    .stdout-card, .stderr-card {
      transform: translateY(80px);
    }
    .python-shell.open .stdout-card,
    .python-shell.open .stderr-card {
      animation-delay: 0ms;
    }
  }
</style>
