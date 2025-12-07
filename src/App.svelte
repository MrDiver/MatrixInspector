<script>
  import { onMount } from 'svelte';
  import MatrixView from './lib/MatrixView.svelte';
  import CSRView from './lib/CSRView.svelte';
  import ColorPicker from './lib/ColorPicker.svelte';
  import Notification from './lib/Notification.svelte';
  import Gallery from './lib/Gallery.svelte';
  import PythonEditor from './lib/PythonEditor.svelte';
  import PythonMatrixView from './lib/PythonMatrixView.svelte';
  import { rows, cols, symmetric, mirrorS, initializeMatrices, generateRandomMatrix, currentColor, syncSLeftToSRight, fillDiagonal, transposeState, pythonMatrix } from './lib/stores';
  import { darkMode } from './lib/themeStore';
  import { get } from 'svelte/store';
  import './sw-registration.js';
    // Transpose state for each matrix
    $: transpose = $transposeState;

    function toggleTranspose(matrix) {
      transposeState.update(state => ({ ...state, [matrix]: !state[matrix] }));
    }

  let notificationComponent;
    let pythonEditorOpen = false;
    let pythonResult = null;
  
    // Sync Python result into store (including clearing when null)
    $: pythonMatrix.set(pythonResult);
  
  let rowsValue = 5;
  let colsValue = 5;
  let symmetricValue = false;
  let mirrorSValue = false;
  let sparsityValue = 0.3;
  let generateSymmetric = false;
  let showCSR = true;
  
  onMount(() => {
    // Initialize matrices on mount
    initializeMatrices(rowsValue, colsValue, mirrorSValue, symmetricValue);
  });
  
  // Watch mirror checkbox and sync when enabled
  $: if (mirrorSValue) {
    syncSLeftToSRight();
  }
  
  // Sync symmetric checkbox to store
  $: symmetric.set(symmetricValue);
  
  // Sync mirror checkbox to store
  $: mirrorS.set(mirrorSValue);
  
  // Watch for row/col changes and resize immediately
  $: if (rowsValue && colsValue) {
    handleResize();
  }
  
  function handleResize() {
    const r = Math.max(1, Math.min(50, rowsValue));
    const c = Math.max(1, Math.min(50, colsValue));
    
    // Only resize if dimensions actually changed
    let currentRows, currentCols;
    rows.subscribe(val => currentRows = val)();
    cols.subscribe(val => currentCols = val)();
    
    if (r !== currentRows || c !== currentCols) {
      initializeMatrices(r, c, mirrorSValue, symmetricValue);
    }
  }
  
  function handleClear() {
    initializeMatrices(
      Math.max(1, rowsValue),
      Math.max(1, colsValue),
      mirrorSValue,
      symmetricValue
    );
  }
  
  function handleRandomS() {
    let color;
    currentColor.subscribe(c => color = c)();
    generateRandomMatrix('S_left', sparsityValue, generateSymmetric, color);
    
    if (mirrorSValue) {
      // Copy S_left to S_right when mirror is enabled
      generateRandomMatrix('S_right', 0, false, color); // Clear first
      // The paint will be mirrored automatically
    }
  }
  
  function handleRandomK() {
    let color;
    currentColor.subscribe(c => color = c)();
    generateRandomMatrix('K', sparsityValue, generateSymmetric, color);
  }
  
  function handleRandomSRight() {
    let color;
    currentColor.subscribe(c => color = c)();
    generateRandomMatrix('S_right', sparsityValue, generateSymmetric, color);
  }

  function handleFillDiagonal(matrixName) {
    let color;
    currentColor.subscribe(c => color = c)();
    fillDiagonal(matrixName, color);
  }
  
  async function captureMatrixScreenshot() {
    const area = document.getElementById('screenshot-area');
    if (!area) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(area, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `matrix-inspector-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        notificationComponent.show('Screenshot downloaded!', 'success');
      });
    } catch (error) {
      console.error('Screenshot failed:', error);
      notificationComponent.show('Screenshot failed. Please try again.', 'error');
    }
  }

  async function copyMatrixScreenshot() {
    const area = document.getElementById('screenshot-area');
    if (!area) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(area, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      if (navigator.clipboard && window.ClipboardItem) {
        canvas.toBlob(async (blob) => {
          try {
            await navigator.clipboard.write([
              new window.ClipboardItem({ 'image/png': blob })
            ]);
            notificationComponent.show('Screenshot copied to clipboard!', 'success');
          } catch (err) {
            notificationComponent.show('Copy to clipboard failed.', 'error');
          }
        });
      } else {
        notificationComponent.show('Clipboard API not supported.', 'error');
      }
    } catch (error) {
      console.error('Screenshot failed:', error);
      notificationComponent.show('Screenshot failed. Please try again.', 'error');
    }
  }
</script>

<main>
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="12" height="12" fill="#4363d8" rx="2"/>
          <rect x="18" y="2" width="12" height="12" fill="#46f0f0" rx="2"/>
          <rect x="2" y="18" width="12" height="12" fill="#f58231" rx="2"/>
          <rect x="18" y="18" width="12" height="12" fill="#e6194b" rx="2"/>
        </svg>
        <h1>Matrix Inspector</h1>
      </div>
      <span class="subtitle">SKS Sparse Matrix Layout</span>
    </div>
    
    <div class="header-actions">
      <button on:click={captureMatrixScreenshot} class="icon-btn" title="Screenshot">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </button>
      <button on:click={copyMatrixScreenshot} class="icon-btn" title="Copy Screenshot">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <rect x="3" y="3" width="13" height="13" rx="2"/>
        </svg>
      </button>
      <button on:click={() => showCSR = !showCSR} class="icon-btn" title="Toggle CSR View">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
        </svg>
      </button>
      <button on:click={() => darkMode.update(d => !d)} class="icon-btn" title="Toggle Dark Mode">
        {#if $darkMode}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        {:else}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        {/if}
      </button>
      <button on:click={() => pythonEditorOpen = !pythonEditorOpen} class="icon-btn" class:active={pythonEditorOpen} title="Python Editor (Ctrl+P)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9.5 2c-1.82 0-3.53.5-5 1.35C2.99 4.34 2 6.05 2 8c0 .83.09 1.64.26 2.4L2 20h6l.74-10h6.52L16 20h6l-.26-9.6c.17-.76.26-1.57.26-2.4 0-1.95-.99-3.66-2.5-4.65C18.03 2.5 16.32 2 14.5 2z"/>
        </svg>
      </button>
    </div>
  </header>

  <div class="toolbar">
    <div class="toolbar-row">
      <div class="toolbar-section">
        <span class="section-label">📐 Dimensions</span>
        <label class="input-group">
          <span>Rows</span>
          <input type="number" min="1" max="50" bind:value={rowsValue}/>
        </label>
        <label class="input-group">
          <span>Cols</span>
          <input type="number" min="1" max="50" bind:value={colsValue}/>
        </label>
      </div>

      <div class="toolbar-section">
        <button on:click={handleClear} class="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Clear
        </button>
      </div>
    </div>

    <div class="toolbar-row">
      <div class="toolbar-section">
        <span class="section-label">🎨 Paint Mode</span>
        <ColorPicker />
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={symmetricValue} />
          <span>Symmetric</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={mirrorSValue} />
          <span>Mirror S</span>
        </label>
      </div>
    </div>

    <div class="toolbar-row">
      <div class="toolbar-section">
        <span class="section-label">🎲 Generate</span>
        <label class="input-group">
          <span>Sparsity</span>
          <input type="number" min="0" max="1" step="0.05" bind:value={sparsityValue}/>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={generateSymmetric} />
          <span>Sym Pattern</span>
        </label>
      </div>
    </div>
  </div>

  <div class="action-panel">
    <div class="action-group">
      <span class="group-title">Random Fill</span>
      <button on:click={handleRandomS} class="btn btn-primary">S_left</button>
      <button on:click={handleRandomK} class="btn btn-primary">K</button>
      <button on:click={handleRandomSRight} class="btn btn-primary">S_right</button>
    </div>

    <div class="action-group">
      <span class="group-title">Fill Diagonal</span>
      <button on:click={() => handleFillDiagonal('S_left')} class="btn btn-accent">S_left</button>
      <button on:click={() => handleFillDiagonal('K')} class="btn btn-accent">K</button>
      <button on:click={() => handleFillDiagonal('S_right')} class="btn btn-accent">S_right</button>
    </div>
  </div>
  
  
  <div class="workspace">
    <div class="screenshot-area" id="screenshot-area">
      <div class="matrix-grid">
        <div class="matrix-row">
          <div class="matrix-cell">
            <MatrixView
              matrixName="S_left"
              label="S (Left)"
              paintable={true}
            />
            <button class="transpose-btn" on:click={() => toggleTranspose('S_left')} title="Transpose S_left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 17v-6a2 2 0 0 1 2-2h6"/><polyline points="10 9 16 9 16 15"/></svg>
              {transpose.S_left ? 'Untranspose' : 'Transpose'}
            </button>
          </div>
          <div class="matrix-cell">
            <MatrixView
              matrixName="K"
              label="K"
              paintable={true}
            />
            <button class="transpose-btn" on:click={() => toggleTranspose('K')} title="Transpose K">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 17v-6a2 2 0 0 1 2-2h6"/><polyline points="10 9 16 9 16 15"/></svg>
              {transpose.K ? 'Untranspose' : 'Transpose'}
            </button>
          </div>
          <div class="matrix-cell">
            <MatrixView
              matrixName="S_right"
              label="S (Right)"
              paintable={!mirrorSValue}
            />
            <button class="transpose-btn" on:click={() => toggleTranspose('S_right')} title="Transpose S_right">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 17v-6a2 2 0 0 1 2-2h6"/><polyline points="10 9 16 9 16 15"/></svg>
              {transpose.S_right ? 'Untranspose' : 'Transpose'}
            </button>
          </div>
        </div>
        <div class="matrix-row">
          <div class="matrix-cell">
            <MatrixView
              matrixName="KS"
              label="KS (Intermediate)"
              showMiniBlocks={true}
              grayBackground={true}
            />
          </div>
          <div class="matrix-cell">
            <MatrixView
              matrixName="O"
              label="O = S_left · K · S_right"
              showMiniBlocks={true}
              grayBackground={true}
            />
          </div>
          {#if $pythonMatrix}
            <div class="matrix-cell">
              <PythonMatrixView label="O(py)" />
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
  
  {#if showCSR}
    <div class="csr-panel">
      <CSRView matrixName="K" label="K" />
      <CSRView matrixName="S_left" label="S_left" />
      <CSRView matrixName="KS" label="KS" />
      <CSRView matrixName="O" label="O" />
    </div>
  {/if}

  <Notification bind:this={notificationComponent} />
  <Gallery />
  <PythonEditor bind:isOpen={pythonEditorOpen} bind:pythonResult />
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    margin: 0;
    padding: 0;
    background: var(--bg-secondary);
    color: var(--text-primary);
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  
  main {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: var(--header-gradient);
    color: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    gap: 16px;
    flex-wrap: wrap;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
  }

  .subtitle {
    font-size: 12px;
    opacity: 0.8;
  }

  .header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .icon-btn {
    padding: 8px;
    background: var(--button-hover-bg);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    color: white;
    transition: background 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  :global(.icon-btn.active) {
    background: var(--button-active-bg);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25);
  }

  .icon-btn:hover {
    background: var(--button-active-bg);
  }

  .icon-btn:active {
    transform: scale(0.95);
  }

  button.transpose-btn {
    margin-top: 6px;
    padding: 6px 12px;
    background: var(--bg-tertiary);
    color: var(--primary-blue);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
    touch-action: manipulation;
  }

  button.transpose-btn:hover {
    background: var(--primary-blue);
    color: white;
    border-color: var(--primary-blue);
  }

  button.transpose-btn:active {
    transform: scale(0.95);
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    overflow-x: auto;
  }

  .toolbar-row {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }

  .toolbar-section {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .section-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-right: 4px;
    white-space: nowrap;
  }

  .input-group {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-tertiary);
  }

  .input-group span {
    font-weight: 500;
    white-space: nowrap;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-tertiary);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }

  .action-panel {
    display: flex;
    gap: 16px;
    padding: 16px;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    flex-wrap: wrap;
    overflow-x: auto;
  }

  .action-group {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .group-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-right: 4px;
    white-space: nowrap;
  }

  .btn {
    padding: 8px 14px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
    touch-action: manipulation;
    white-space: nowrap;
  }

  .btn-primary {
    background: var(--primary-blue);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-blue-hover);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(67, 99, 216, 0.3);
  }

  .btn-primary:active {
    transform: translateY(0);
  }

  .btn-accent {
    background: var(--accent-cyan);
    color: #1a202c;
  }

  .btn-accent:hover {
    background: var(--accent-cyan-hover);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(70, 240, 240, 0.3);
  }

  .btn-accent:active {
    transform: translateY(0);
  }

  .btn-secondary {
    background: var(--danger-red);
    color: white;
  }

  .btn-secondary:hover {
    background: var(--danger-red-hover);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  }

  .btn-secondary:active {
    transform: translateY(0);
  }
  
  .workspace {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    flex: 1;
    background: none;
    padding: 12px;
    overflow-x: auto;
  }

  .screenshot-area {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    padding: 16px;
    margin-top: 12px;
    background: var(--bg-primary);
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
    min-width: min-content;
  }
  
  .matrix-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .matrix-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
  }

  .matrix-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    min-width: 200px;
    flex-shrink: 0;
  }

  
  .csr-panel {
    display: flex;
    flex-direction: row;
    gap: 16px;
    padding: 16px;
    background: var(--bg-primary);
    border-top: 1px solid var(--border-color);
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
    overflow-x: auto;
  }
  
  input[type="number"] {
    padding: 6px 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-radius: 6px;
    font-size: 13px;
    width: 60px;
    transition: border-color 0.15s;
  }

  input[type="number"]:focus {
    outline: none;
    border-color: var(--primary-blue);
    box-shadow: 0 0 0 3px var(--input-focus-shadow);
  }
  
  input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: var(--primary-blue);
  }

  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .app-header {
      flex-direction: column;
      align-items: flex-start;
      padding: 12px 16px;
      gap: 12px;
    }

    .header-left {
      width: 100%;
    }

    .logo {
      gap: 10px;
    }

    .logo h1 {
      font-size: 18px;
    }

    .header-actions {
      width: 100%;
      justify-content: space-around;
    }

    .toolbar {
      padding: 12px;
      gap: 8px;
    }

    .toolbar-row {
      gap: 12px;
    }

    .toolbar-section {
      gap: 8px;
    }

    .action-panel {
      padding: 12px;
      gap: 12px;
    }

    .action-group {
      gap: 6px;
    }

    .workspace {
      padding: 8px;
    }

    .screenshot-area {
      padding: 12px;
      gap: 12px;
      border-radius: 12px;
    }

    .matrix-row {
      gap: 12px;
    }

    .matrix-cell {
      gap: 8px;
      min-width: 160px;
    }

    .btn {
      padding: 6px 12px;
      font-size: 12px;
    }

    .icon-btn {
      padding: 6px;
    }

    button.transpose-btn {
      padding: 4px 8px;
      font-size: 11px;
    }

    .input-group,
    .checkbox-label {
      font-size: 12px;
    }

    input[type="number"] {
      width: 50px;
      padding: 4px 8px;
      font-size: 12px;
    }

    .csr-panel {
      padding: 12px;
      gap: 12px;
    }
  }

  @media (max-width: 480px) {
    .logo h1 {
      font-size: 16px;
    }

    .subtitle {
      font-size: 11px;
    }

    .header-actions {
      gap: 8px;
    }

    .icon-btn {
      padding: 5px;
    }

    .section-label,
    .group-title {
      font-size: 12px;
    }

    .toolbar {
      padding: 8px;
    }

    .toolbar-row {
      gap: 8px;
    }

    .toolbar-section {
      gap: 6px;
    }

    .action-panel {
      padding: 8px;
      gap: 8px;
    }

    .matrix-cell {
      min-width: 140px;
    }

    .btn {
      padding: 5px 10px;
      font-size: 11px;
    }

    input[type="number"] {
      width: 45px;
      padding: 3px 6px;
      font-size: 11px;
    }

    .input-group,
    .checkbox-label {
      font-size: 11px;
    }

    button.transpose-btn {
      padding: 3px 6px;
      font-size: 10px;
    }
  }
</style>
