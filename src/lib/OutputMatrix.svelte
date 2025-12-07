<script>
  import { outputMatrix, highlightOutputCell, clearHighlight } from './computationLayer';
  
  function handleCellHover(row, col) {
    highlightOutputCell(row, col);
  }
  
  function handleCellLeave() {
    clearHighlight();
  }
</script>

<div class="output-matrix">
  <div class="matrix-label">Output (O)</div>
  {#if $outputMatrix}
    <div 
      class="matrix-grid"
      style:grid-template-columns="repeat({$outputMatrix[0].length}, 40px)"
    >
      {#each $outputMatrix as row, i}
        {#each row as cell, j}
          <div
            role="button"
            tabindex="0"
            class="matrix-cell"
            class:has-value={cell.value !== 0}
            on:mouseenter={() => handleCellHover(i, j)}
            on:mouseleave={handleCellLeave}
            title={cell.dependencies.size > 0 ? `Dependencies: ${Array.from(cell.dependencies).join(', ')}` : ''}
          >
            {cell.value || ''}
          </div>
        {/each}
      {/each}
    </div>
  {:else}
    <div class="no-data">Compute to see output</div>
  {/if}
</div>

<style>
  .output-matrix {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border: 2px solid var(--primary-color, #667eea);
    border-radius: 8px;
    background: var(--bg-secondary, #f9f9f9);
  }
  
  .matrix-label {
    font-weight: bold;
    font-size: 1.2rem;
    color: var(--primary-color, #667eea);
  }
  
  .matrix-grid {
    display: grid;
    gap: 2px;
  }
  
  .matrix-cell {
    width: 40px;
    height: 40px;
    border: 1px solid var(--border-color, #ccc);
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    cursor: help;
    transition: all 0.2s;
  }
  
  .matrix-cell:hover {
    border-color: var(--primary-color, #667eea);
    transform: scale(1.1);
    z-index: 10;
  }
  
  .matrix-cell.has-value {
    font-weight: bold;
    background: #e8eef7;
    color: var(--primary-color, #667eea);
  }
  
  .no-data {
    padding: 2rem;
    color: var(--text-secondary, #999);
    font-style: italic;
  }
</style>
