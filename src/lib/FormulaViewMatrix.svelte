<script>
  import { formulaViewMatrices } from './viewLayer';
  import { highlightedDependencies } from './computationLayer';
  
  export let viewMatrix;
  
  $: data = viewMatrix.getData();
  
  function isCellHighlighted(row, col) {
    // Check if this cell (in the base matrix coordinates) is highlighted
    const depKey = viewMatrix.isTransposed 
      ? `${viewMatrix.baseName}:${col}:${row}`  // Swap back to base coordinates
      : `${viewMatrix.baseName}:${row}:${col}`;
    return $highlightedDependencies.has(depKey);
  }
</script>

<div class="view-matrix">
  <div class="matrix-label">{viewMatrix.displayName}</div>
  {#if data}
    <div 
      class="matrix-grid"
      style:grid-template-columns="repeat({viewMatrix.cols}, 40px)"
    >
      {#each data as row, i}
        {#each row as cell, j}
          {@const highlighted = isCellHighlighted(i, j)}
          <div
            class="matrix-cell"
            class:painted={cell.value !== 0}
            class:highlighted={highlighted}
            style:background-color={cell.color || 'transparent'}
          >
            {cell.value || ''}
          </div>
        {/each}
      {/each}
    </div>
  {:else}
    <div class="no-data">N/A</div>
  {/if}
</div>

<style>
  .view-matrix {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  
  .matrix-label {
    font-weight: bold;
    font-size: 1.1rem;
    color: var(--text-primary, #333);
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
  
  .no-data {
    padding: 2rem;
    color: var(--text-secondary, #999);
    font-style: italic;
  }
</style>
