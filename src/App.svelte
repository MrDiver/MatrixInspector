<script>
  import { onMount } from 'svelte';
  import MatrixView from './lib/MatrixView.svelte';
  import CSRView from './lib/CSRView.svelte';
  import ColorPicker from './lib/ColorPicker.svelte';
  import Notification from './lib/Notification.svelte';
  import Gallery from './lib/Gallery.svelte';
  import PythonEditor from './lib/PythonEditor.svelte';
  import PythonMatrixView from './lib/PythonMatrixView.svelte';
  import FormulaToolbar from './lib/FormulaToolbar.svelte';
  import ToggleIcon from './lib/ToggleIcon.svelte';
  import { symmetric, initializeFormulaMatrices, generateRandomMatrix, currentColor, fillDiagonal, transposeState, pythonMatrix, parsedFormula, matrixDimensions, setMatrixDimensions, clearPersistentSelections, persistentSelections, paintIdentityMode } from './lib/stores';
  import { getBaseMatrices, getAllMatrixReferences } from './lib/formulaParser';
  import { darkMode } from './lib/themeStore';
  import './sw-registration.js';
    // Transpose state for each matrix
    $: transpose = $transposeState;

    function toggleTranspose(matrix) {
      transposeState.update(state => ({ ...state, [matrix]: !state[matrix] }));
    }

    // Initialize formula matrices when formula changes (regardless of modal state)
    $: if ($parsedFormula) {
      const baseMatrices = getBaseMatrices($parsedFormula);
      if (baseMatrices.length > 0) {
        initializeFormulaMatrices(baseMatrices);
      }
    }

  let notificationComponent;
  let pythonEditorOpen = false;
  let pythonResult = null;
  let showShortcutModal = false;

  // Sync Python result into store (including clearing when null)
  $: pythonMatrix.set(pythonResult);

  let symmetricValue = false;
  let sparsityValue = 0.3;
  let generateSymmetric = false;
  let showCSR = true;

  function handleKeyPress(e) {
    // Don't trigger shortcuts if user is typing in an input
    if (e.target.matches('input[type="text"], textarea, input[type="number"]')) {
      return;
    }

    if (e.key === '1') {
      e.preventDefault();
      paintIdentityMode.update(v => !v);
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      symmetricValue = !symmetricValue;
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      generateSymmetric = !generateSymmetric;
    } else if (e.key === '?') {
      e.preventDefault();
      showShortcutModal = !showShortcutModal;
    }
  }
  
  onMount(() => {
    // Initialize formula-driven matrices
    const baseMatrices = getBaseMatrices($parsedFormula);
    if (baseMatrices.length > 0) {
      initializeFormulaMatrices(baseMatrices);
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  });
  
  // Sync symmetric checkbox to store
  $: symmetric.set(symmetricValue)
  
  function handleClear() {
    // Clear matrices based on current formula
    const baseMatrices = getBaseMatrices($parsedFormula);
    if (baseMatrices.length > 0) {
      initializeFormulaMatrices(baseMatrices);
    }
  }

  function handleDimensionInput(matrixName, key, value) {
    const dims = $matrixDimensions[matrixName] || { rows: 5, cols: 5 };
    const next = { ...dims, [key]: Number(value) };
    setMatrixDimensions(matrixName, next.rows, next.cols);
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
      <button on:click={() => showShortcutModal = !showShortcutModal} class="icon-btn" title="Keyboard Shortcuts (?)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4m0 -2v.01"/>
        </svg>
      </button>
    </div>
  </header>

  <!-- Formula Toolbar - Always visible, drives the entire application -->
  <FormulaToolbar />


  <div class="toolbar">
    <div class="toolbar-row">
      <div class="toolbar-section">
        <span class="section-label">📐 Matrix Dimensions</span>
        {#if $parsedFormula}
          {@const baseMatrices = getBaseMatrices($parsedFormula)}
          {#each baseMatrices as matrixName}
            <div class="dimension-spinner">
              <label class="input-group">
                <span>{matrixName}</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={$matrixDimensions[matrixName]?.rows || 5}
                  on:change={(e) => { const el = e.target; if (el instanceof HTMLInputElement) handleDimensionInput(matrixName, 'rows', el.value); }}
                />
                <span class="x">×</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={$matrixDimensions[matrixName]?.cols || 5}
                  on:change={(e) => { const el = e.target; if (el instanceof HTMLInputElement) handleDimensionInput(matrixName, 'cols', el.value); }}
                />
              </label>
            </div>
          {/each}
        {/if}
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
        <label class="toggle-button" title="Paint Identity">
          <input type="checkbox" bind:checked={$paintIdentityMode} />
          <span><ToggleIcon type="identity" /></span>
        </label>
        <label class="toggle-button" title="Symmetric">
          <input type="checkbox" bind:checked={symmetricValue} />
          <span><ToggleIcon type="symmetric" /></span>
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
        <label class="toggle-button" title="Symmetric Pattern">
          <input type="checkbox" bind:checked={generateSymmetric} />
          <span><ToggleIcon type="sympattern" /></span>
        </label>
      </div>
    </div>
  </div>

  <div class="workspace">
    <div class="screenshot-area" id="screenshot-area">
      {#if $parsedFormula}
        {@const baseMatrices = getBaseMatrices($parsedFormula)}
        {@const allRefs = getAllMatrixReferences($parsedFormula)}
        
        <div class="matrix-grid formula-layout">
          <!-- Row 1: Formula matrices in order (including transposes) -->
          <div class="matrix-row">
            {#each allRefs as ref}
              <div class="matrix-cell">
                <div class="matrix-with-actions">
                  <MatrixView
                    matrixName={ref.transpose ? `${ref.name}_T` : ref.name}
                    label={ref.displayName}
                    paintable={ref.editable}
                    grayBackground={true}
                  />
                  {#if ref.editable}
                    <div class="matrix-actions">
                      <button class="matrix-icon-btn" class:active={transpose[ref.name]} on:click={() => toggleTranspose(ref.name)} title="Transpose {ref.name}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 17v-6a2 2 0 0 1 2-2h6"/><polyline points="10 9 16 9 16 15"/></svg>
                      </button>
                      <button class="matrix-icon-btn" on:click={() => { let color; currentColor.subscribe(c => color = c)(); generateRandomMatrix(ref.name, sparsityValue, generateSymmetric, color); }} title="Random Fill {ref.name}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>
                      </button>
                      <button class="matrix-icon-btn" on:click={() => { let color; currentColor.subscribe(c => color = c)(); fillDiagonal(ref.name, color); }} title="Fill Diagonal {ref.name}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="2" x2="22" y2="22"/></svg>
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          
          <!-- Row 2: Result Matrix -->
          <div class="matrix-row result-row">
            <div class="matrix-cell">
              <div class="matrix-with-controls">
                <MatrixView
                  matrixName="O"
                  label="O = {$parsedFormula.raw}"
                  showMiniBlocks={true}
                  grayBackground={true}
                />
                {#if $persistentSelections.size > 0}
                  <div class="selection-controls">
                    <button 
                      class="clear-btn"
                      on:click={clearPersistentSelections}
                      title="Clear pattern selection (Ctrl+Click cells to multi-select)"
                    >
                      Clear Selection ({$persistentSelections.size})
                    </button>
                  </div>
                {/if}
              </div>
            </div>
            {#if $pythonMatrix}
              <div class="matrix-cell">
                <PythonMatrixView label="O(py)" />
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  {#if showCSR && $parsedFormula}
    {@const baseMatrices = getBaseMatrices($parsedFormula)}
    <div class="csr-panel">
      {#each baseMatrices as matrixName}
        <CSRView matrixName={matrixName} label={matrixName} />
      {/each}
      <CSRView matrixName="O" label="O" />
    </div>
  {/if}

  <Notification bind:this={notificationComponent} />
  <Gallery on:notify={(e) => notificationComponent?.show(e.detail.message, e.detail.type)} />
  <PythonEditor bind:isOpen={pythonEditorOpen} bind:pythonResult />

  <!-- Keyboard Shortcuts Modal -->
  {#if showShortcutModal}
    <div class="modal-overlay" on:click={() => showShortcutModal = false}>
      <div class="modal" on:click|stopPropagation>
        <div class="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button on:click={() => showShortcutModal = false} class="close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-content">
          <div class="shortcut-group">
            <h3>Paint Mode</h3>
            <div class="shortcut-item">
              <kbd>1</kbd>
              <span>Toggle Paint Identity</span>
            </div>
            <div class="shortcut-item">
              <kbd>S</kbd>
              <span>Toggle Symmetric</span>
            </div>
            <div class="shortcut-item">
              <kbd>P</kbd>
              <span>Toggle Symmetric Pattern</span>
            </div>
          </div>
          <div class="shortcut-group">
            <h3>Help</h3>
            <div class="shortcut-item">
              <kbd>?</kbd>
              <span>Show This Menu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
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

  .formula-layout .matrix-row {
    justify-content: flex-start;
    gap: 16px;
    margin-bottom: 24px;
  }

  .formula-layout .result-row {
    border-top: 2px solid var(--border-color);
    padding-top: 24px;
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

  .matrix-icon-btn {
    padding: 8px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    touch-action: manipulation;
    width: 36px;
    height: 36px;
  }

  .matrix-icon-btn:hover {
    border-color: var(--primary-blue);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
  }

  .matrix-icon-btn:active {
    transform: translateY(0);
  }

  .matrix-icon-btn.active {
    background: #43e97b;
    color: white;
    border-color: #43e97b;
  }

  .matrix-icon-btn.active:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(67, 233, 123, 0.3);
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

  .dimension-spinner {
    display: flex;
    align-items: center;
  }

  .dimension-spinner .input-group {
    gap: 4px;
  }

  .dimension-spinner .x {
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0 2px;
    display: flex;
    align-items: center;
    height: 1.2em;
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

  .matrix-with-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .matrix-actions {
    display: flex;
    gap: 6px;
    justify-content: center;
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

  .toggle-button {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .toggle-button input[type="checkbox"] {
    display: none;
  }

  .toggle-button span {
    padding: 2px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    transition: all 0.2s;
    touch-action: manipulation;
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    min-height: 36px;
  }

  .toggle-button span :global(svg) {
    width: 22px;
    height: 22px;
    color: currentColor;
  }

  .toggle-button input[type="checkbox"]:checked + span {
    background: var(--primary-blue);
    color: var(--text-primary);
    border-color: var(--primary-blue);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    font-size: 16px;
  }

  .toggle-button:hover span {
    border-color: var(--primary-blue);
    background: var(--bg-hover);
  }

  .toggle-button input[type="checkbox"]:checked + span:hover {
    background: var(--primary-blue);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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

  :global(html.dark) .btn-secondary {
    background: #fa709a;
  }

  :global(html.dark) .btn-secondary:hover {
    background: #f55a86;
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

    .section-label {
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
  }

  .matrix-with-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .selection-controls {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .clear-btn {
    padding: 8px 16px;
    background: var(--color-rose);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(250, 112, 154, 0.25);
  }

  .clear-btn:hover {
    background: #e63f7d;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(250, 112, 154, 0.35);
  }

  .clear-btn:active {
    transform: translateY(0);
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
  }

  .modal {
    background: var(--bg-primary);
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    border: 1px solid var(--border-color);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .modal-content {
    padding: 20px;
  }

  .shortcut-group {
    margin-bottom: 24px;
  }

  .shortcut-group:last-child {
    margin-bottom: 0;
  }

  .shortcut-group h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }

  .shortcut-item kbd {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 4px 8px;
    font-family: 'Courier New', monospace;
    font-weight: 600;
    font-size: 12px;
    color: var(--text-primary);
    min-width: 40px;
    text-align: center;
  }

  .shortcut-item span {
    color: var(--text-primary);
    font-size: 14px;
  }
</style>

