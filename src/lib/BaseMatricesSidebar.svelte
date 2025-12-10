<script>
  /**
   * BaseMatricesSidebar - Display and edit base matrices in a sidebar
   * Shows S, K, etc. with editing controls (random fill, diagonal fill, transpose, size)
   */
  import MatrixView from './MatrixView.svelte';
  import { parsedFormula, currentColor, transposeState, matrixDimensions, symmetricPattern, setMatrixDimensions, clearMatrix } from './stores';
  import { getBaseMatrices } from './formulaParser';
  import { generateRandomMatrix, fillDiagonal } from './stores';

  let baseMatrices = [];
  let transpose = {};
  let dimensions = {};
  let resizing = null; // {matrixName, startX, startY, startRows, startCols}

  // Update base matrices when formula changes
  $: if ($parsedFormula) {
    baseMatrices = getBaseMatrices($parsedFormula);
    // Initialize transpose state for new matrices
    baseMatrices.forEach(name => {
      if (!(name in $transposeState)) {
        transposeState.update(state => ({ ...state, [name]: false }));
      }
    });
  }

  // Watch transpose state
  $: transpose = $transposeState;

  // Watch matrix dimensions
  $: dimensions = $matrixDimensions;

  function toggleTranspose(matrix) {
    transposeState.update(state => ({ ...state, [matrix]: !state[matrix] }));
  }

  function handleDimensionInput(matrixName, key, value) {
    const dims = $matrixDimensions[matrixName] || { rows: 5, cols: 5 };
    const next = { ...dims, [key]: Number(value) };
    setMatrixDimensions(matrixName, next.rows, next.cols);
  }

  function startResize(e, matrixName) {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    
    const dims = $matrixDimensions[matrixName] || { rows: 5, cols: 5 };
    resizing = {
      matrixName,
      startX: e.clientX,
      startY: e.clientY,
      startRows: dims.rows,
      startCols: dims.cols
    };

    function handleMouseMove(moveEvent) {
      if (!resizing) return;
      
      // Calculate how many cells to add (each ~20px)
      const deltaX = moveEvent.clientX - resizing.startX;
      const deltaY = moveEvent.clientY - resizing.startY;
      
      // Sensitivity: ~25px per cell change
      const colDelta = Math.round(deltaX / 25);
      const rowDelta = Math.round(deltaY / 25);
      
      const newCols = Math.max(1, Math.min(50, resizing.startCols + colDelta));
      const newRows = Math.max(1, Math.min(50, resizing.startRows + rowDelta));
      
      setMatrixDimensions(resizing.matrixName, newRows, newCols);
    }

    function handleMouseUp() {
      resizing = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
</script>

<aside class="base-matrices-sidebar">
  <div class="sidebar-header">
    <h3>Matrices</h3>
  </div>

  <div class="matrices-container">
    {#if baseMatrices.length > 0}
      {#each baseMatrices as matrixName}
        <div class="matrix-item">
          <div class="matrix-display">
            <MatrixView
              matrixName={transpose[matrixName] ? `${matrixName}_T` : matrixName}
              label={matrixName}
              paintable={true}
              grayBackground={false}
            />
            <!-- Draggable resize handle in bottom-right corner -->
            <div 
              class="resize-handle" 
              role="button"
              tabindex="0"
              on:mousedown={(e) => startResize(e, matrixName)}
              title="Drag to resize matrix"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <!-- Grid pattern: 2x2 cubes in each direction -->
                <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
                <circle cx="18" cy="6" r="1.5" fill="currentColor"/>
                <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="18" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="6" cy="18" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="18" r="1.5" fill="currentColor"/>
                <circle cx="18" cy="18" r="1.5" fill="currentColor"/>
              </svg>
            </div>
          </div>

          <div class="matrix-size">
            <label class="size-input-group">
              <input
                type="number"
                min="1"
                max="50"
                value={dimensions[matrixName]?.rows || 5}
                on:change={(e) => { const el = e.target; if (el instanceof HTMLInputElement) handleDimensionInput(matrixName, 'rows', el.value); }}
              />
              <span class="size-sep">×</span>
              <input
                type="number"
                min="1"
                max="50"
                value={dimensions[matrixName]?.cols || 5}
                on:change={(e) => { const el = e.target; if (el instanceof HTMLInputElement) handleDimensionInput(matrixName, 'cols', el.value); }}
              />
            </label>
          </div>

          <div class="matrix-controls">
            <button
              class="control-btn"
              class:active={transpose[matrixName]}
              on:click={() => toggleTranspose(matrixName)}
              title="Transpose {matrixName}"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 17v-6a2 2 0 0 1 2-2h6"/>
                <polyline points="10 9 16 9 16 15"/>
              </svg>
            </button>

            <button
              class="control-btn"
              on:click={() => {
                let color;
                currentColor.subscribe(c => (color = c))();
                let symPattern;
                symmetricPattern.subscribe(v => symPattern = v)();
                generateRandomMatrix(matrixName, 0.3, symPattern, color);
              }}
              title="Random Fill {matrixName}"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M2 12h20"/>
              </svg>
            </button>

            <button
              class="control-btn"
              on:click={() => {
                let color;
                currentColor.subscribe(c => (color = c))();
                fillDiagonal(matrixName, color);
              }}
              title="Fill Diagonal {matrixName}"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="2" y1="2" x2="22" y2="22"/>
              </svg>
            </button>

            <button
              class="control-btn"
              on:click={() => clearMatrix(matrixName)}
              title="Clear {matrixName}"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      {/each}
    {:else}
      <div class="empty-state">
        <p>Enter a formula to see matrices</p>
      </div>
    {/if}
  </div>
</aside>

<style>
  .base-matrices-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    margin: 12px;
    margin-right: 0;
    background: var(--bg-primary);
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
    height: fit-content;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    min-width: 240px;
    width: auto;
  }

  .sidebar-header {
    position: sticky;
    top: 0;
    background: var(--bg-primary);
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    margin: -1rem -1rem 0 -1rem;
    padding: 1rem 1rem 0.75rem 1rem;
    border-radius: 16px 16px 0 0;
  }

  .sidebar-header h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-primary, #333);
  }

  .matrices-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .matrix-item {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .matrix-display {
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    border-radius: 8px;
    padding: 0.5rem;
    background: var(--bg-secondary);
    position: relative;
  }

  .resize-handle {
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    background: rgba(76, 175, 80, 0.1);
    border-radius: 4px;
    border: 1px solid rgba(76, 175, 80, 0.3);
    color: var(--accent-color, #4CAF50);
    transition: all 0.2s ease;
  }

  .resize-handle:hover {
    background: rgba(76, 175, 80, 0.2);
    border-color: rgba(76, 175, 80, 0.6);
    box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
  }

  .resize-handle:active {
    cursor: grabbing;
    background: rgba(76, 175, 80, 0.3);
  }

  .resize-handle svg {
    width: 16px;
    height: 16px;
  }

  .matrix-controls {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .matrix-size {
    display: flex;
    justify-content: center;
    margin-bottom: 0.5rem;
  }

  .size-input-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--input-bg, rgba(0, 0, 0, 0.05));
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    font-size: 0.85rem;
  }

  .size-input-group input {
    width: 40px;
    padding: 0.3rem 0.4rem;
    border: none;
    border-radius: 3px;
    background: var(--bg-secondary, white);
    color: var(--text-primary, #333);
    font-size: 0.85rem;
    text-align: center;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .size-input-group input::-webkit-inner-spin-button,
  .size-input-group input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .size-input-group input:focus {
    outline: none;
    background: white;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }

  .size-sep {
    color: var(--text-secondary, #666);
    font-weight: 500;
    font-size: 0.9rem;
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    border-radius: 6px;
    background-color: transparent;
    cursor: pointer;
    color: var(--text-secondary, #666);
    transition: all 0.2s ease;
  }

  .control-btn:hover {
    background-color: var(--hover-bg, #f0f0f0);
    color: var(--text-primary, #333);
    border-color: var(--border-color, rgba(0, 0, 0, 0.15));
  }

  .control-btn.active {
    background-color: var(--accent-color, #4CAF50);
    color: white;
    border-color: var(--accent-color, #4CAF50);
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    color: var(--text-secondary, #999);
    text-align: center;
    font-size: 0.9rem;
  }

  .empty-state p {
    margin: 0;
  }

  /* Dark mode support */
  :global(.dark-mode) .base-matrices-sidebar {
    background: var(--bg-primary-dark);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }

  :global(.dark-mode) .sidebar-header {
    background: var(--bg-primary-dark);
    border-bottom-color: var(--border-color-dark, rgba(255, 255, 255, 0.1));
  }

  :global(.dark-mode) .sidebar-header h3 {
    color: var(--text-primary-dark, #eee);
  }

  :global(.dark-mode) .matrix-display {
    border-color: var(--border-color-dark, rgba(255, 255, 255, 0.1));
    background: var(--bg-secondary-dark);
  }

  :global(.dark-mode) .control-btn {
    border-color: var(--border-color-dark, rgba(255, 255, 255, 0.1));
    background-color: transparent;
    color: var(--text-secondary-dark, #aaa);
  }

  :global(.dark-mode) .control-btn:hover {
    background-color: var(--hover-bg-dark, #333);
    color: var(--text-primary-dark, #eee);
    border-color: var(--border-color-dark, rgba(255, 255, 255, 0.15));
  }

  :global(.dark-mode) .empty-state {
    color: var(--text-secondary-dark, #999);
  }
</style>
