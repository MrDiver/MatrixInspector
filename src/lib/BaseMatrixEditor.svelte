<script>
  import { baseMatrices, setCell, setMatrixDimensions, clearMatrix, deleteMatrix } from './entityStore';
  import { highlightedDependencies } from './computationLayer';
  import { COLOR_PALETTE } from './constants';
  
  export let matrixName;
  export let currentColor = COLOR_PALETTE.accent1;
  
  $: matrix = $baseMatrices.get(matrixName);
  
  function handleCellClick(row, col) {
    if (!matrix) return;
    
    const key = `${row},${col}`;
    const cell = matrix.cells.get(key);
    
    if (cell && cell.value !== 0) {
      // Clear cell
      setCell(matrixName, row, col, 0, null);
    } else {
      // Paint cell
      setCell(matrixName, row, col, 1, currentColor);
    }
  }
  
  function handleRowsChange(e) {
    const newRows = parseInt(e.target.value);
    if (newRows > 0 && newRows <= 20) {
      setMatrixDimensions(matrixName, newRows, matrix.cols);
    }
  }
  
  function handleColsChange(e) {
    const newCols = parseInt(e.target.value);
    if (newCols > 0 && newCols <= 20) {
      setMatrixDimensions(matrixName, matrix.rows, newCols);
    }
  }
  
  function handleClear() {
    if (confirm(`Clear all cells in matrix ${matrixName}?`)) {
      clearMatrix(matrixName);
    }
  }
  
  function handleDelete() {
    if (confirm(`Delete matrix ${matrixName}?`)) {
      deleteMatrix(matrixName);
    }
  }
  
  function isCellHighlighted(row, col) {
    const depKey = `${matrixName}:${row}:${col}`;
    return $highlightedDependencies.has(depKey);
  }
</script>

<div class="base-matrix-editor">
  <div class="matrix-header">
    <h3>{matrixName}</h3>
    <div class="matrix-controls">
      <label>
        Rows:
        <input 
          type="number" 
          min="1" 
          max="20" 
          value={matrix?.rows || 5}
          on:change={handleRowsChange}
        />
      </label>
      <label>
        Cols:
        <input 
          type="number" 
          min="1" 
          max="20" 
          value={matrix?.cols || 5}
          on:change={handleColsChange}
        />
      </label>
      <button on:click={handleClear} class="btn-clear">Clear</button>
      <button on:click={handleDelete} class="btn-delete">Delete</button>
    </div>
  </div>
  
  {#if matrix}
    <div class="matrix-grid">
      {#each Array(matrix.rows) as _, i}
        {#each Array(matrix.cols) as _, j}
          {@const key = `${i},${j}`}
          {@const cell = matrix.cells.get(key)}
          {@const highlighted = isCellHighlighted(i, j)}
          <button
            class="matrix-cell"
            class:painted={cell && cell.value !== 0}
            class:highlighted={highlighted}
            style:background-color={cell?.color || 'transparent'}
            on:click={() => handleCellClick(i, j)}
          >
            {cell?.value || ''}
          </button>
        {/each}
      {/each}
    </div>
  {/if}
</div>

<style>
  .base-matrix-editor {
    padding: 1rem;
    border: 2px solid var(--border-color, #ccc);
    border-radius: 8px;
    background: var(--bg-secondary, #f9f9f9);
  }
  
  .matrix-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .matrix-header h3 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--text-primary, #333);
  }
  
  .matrix-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .matrix-controls label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.9rem;
  }
  
  .matrix-controls input[type="number"] {
    width: 60px;
    padding: 0.25rem;
    border: 1px solid var(--border-color, #ccc);
    border-radius: 4px;
  }
  
  .btn-clear, .btn-delete {
    padding: 0.25rem 0.75rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .btn-clear {
    background: #f0ad4e;
    color: white;
  }
  
  .btn-clear:hover {
    background: #ec971f;
  }
  
  .btn-delete {
    background: #d9534f;
    color: white;
  }
  
  .btn-delete:hover {
    background: #c9302c;
  }
  
  .matrix-grid {
    display: grid;
    gap: 2px;
    grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
    max-width: 600px;
  }
  
  .matrix-cell {
    aspect-ratio: 1;
    border: 1px solid var(--border-color, #ccc);
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .matrix-cell:hover {
    border-color: var(--primary-color, #667eea);
    transform: scale(1.05);
  }
  
  .matrix-cell.painted {
    font-weight: bold;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  }
  
  .matrix-cell.highlighted {
    box-shadow: 0 0 0 3px gold;
    z-index: 10;
  }
</style>
