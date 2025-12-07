<script>
  import { onMount } from 'svelte';
  import MatrixView from './lib/MatrixView.svelte';
  import CSRView from './lib/CSRView.svelte';
  import ColorPicker from './lib/ColorPicker.svelte';
  import { rows, cols, symmetric, mirrorS, initializeMatrices, generateRandomMatrix, currentColor, syncSLeftToSRight, fillDiagonal } from './lib/stores';
  
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
    const workspace = document.querySelector('.workspace');
    if (!workspace) return;
    
    try {
      // Dynamically import html2canvas
      const { default: html2canvas } = await import('html2canvas');
      
      // @ts-ignore - workspace is an HTMLElement
      const canvas = await html2canvas(workspace, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `matrix-inspector-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Screenshot failed:', error);
      alert('Screenshot failed. Please try again.');
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
      <button on:click={() => showCSR = !showCSR} class="icon-btn" title="Toggle CSR View">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
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
    <div class="matrix-col">
      <MatrixView
        matrixName="S_left"
        label="S (Left)"
        paintable={true}
      />
    </div>
    
    <div class="matrix-col">
      <MatrixView
        matrixName="K"
        label="K"
        paintable={true}
      />
      <div style="margin-top: 10px;">
        <MatrixView
          matrixName="KS"
          label="KS (Intermediate)"
          showMiniBlocks={true}
          grayBackground={true}
        />
      </div>
    </div>
    
    <div class="matrix-col">
      <MatrixView
        matrixName="S_right"
        label="S (Right)"
        paintable={!mirrorSValue}
      />
      <div style="margin-top: 10px;">
        <MatrixView
          matrixName="O"
          label="O = S_left · K · S_right"
          showMiniBlocks={true}
          grayBackground={true}
        />
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
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    margin: 0;
    padding: 0;
    background: #f5f7fa;
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.5px;
  }

  .subtitle {
    font-size: 13px;
    opacity: 0.9;
    margin-left: 44px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .icon-btn {
    padding: 8px;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 24px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .toolbar-row {
    display: flex;
    gap: 24px;
    align-items: center;
    flex-wrap: wrap;
  }

  .toolbar-section {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .section-label {
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    margin-right: 4px;
  }

  .input-group {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #4b5563;
  }

  .input-group span {
    font-weight: 500;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #4b5563;
    cursor: pointer;
    user-select: none;
  }

  .action-panel {
    display: flex;
    gap: 24px;
    padding: 16px 24px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
    flex-wrap: wrap;
  }

  .action-group {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .group-title {
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    margin-right: 4px;
  }

  .btn {
    padding: 7px 14px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .btn-primary {
    background: #4363d8;
    color: white;
  }

  .btn-primary:hover {
    background: #3451b8;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(67, 99, 216, 0.3);
  }

  .btn-accent {
    background: #46f0f0;
    color: #1a202c;
  }

  .btn-accent:hover {
    background: #33e6e6;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(70, 240, 240, 0.3);
  }

  .btn-secondary {
    background: #ef4444;
    color: white;
  }

  .btn-secondary:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  }
  
  .workspace {
    display: flex;
    gap: 32px;
    align-items: flex-start;
    padding: 32px 24px;
    flex-wrap: wrap;
    justify-content: center;
    flex: 1;
  }
  
  .matrix-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  
  .csr-panel {
    display: flex;
    flex-direction: row;
    gap: 24px;
    padding: 24px;
    background: white;
    border-top: 1px solid #e5e7eb;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
  }
  
  input[type="number"] {
    padding: 6px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    width: 60px;
    transition: border-color 0.15s;
  }

  input[type="number"]:focus {
    outline: none;
    border-color: #4363d8;
    box-shadow: 0 0 0 3px rgba(67, 99, 216, 0.1);
  }
  
  input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: #4363d8;
  }
</style>
