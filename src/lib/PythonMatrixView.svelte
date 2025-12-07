<script>
  import { pythonMatrix, highlightedElements, graph } from './stores';
  
  export let label = 'O(py)';
  export let grayBackground = true;
  
  let hoveredCell = null;
  
  $: matrixData = $pythonMatrix;
  $: hasData = matrixData && matrixData.data && matrixData.data.length > 0;
  
  const computeScale = (size) => {
    if (!size) return 1;
    if (size <= 12) return 1;
    return Math.max(0.4, 12 / size);
  };
  
  $: rowCount = hasData ? matrixData.rows : 0;
  $: colCount = hasData ? matrixData.cols : 0;
  $: maxDim = Math.max(rowCount, colCount);
  $: scale = computeScale(maxDim);
  $: cellSize = 32 * scale;
  $: cellGap = Math.max(1, 3 * scale);
  
  function handleMouseEnter(row, col) {
    if (!hasData || !matrixData.dependencies) return;
    
    hoveredCell = { row, col };
    
    // Get dependencies for this cell
    const deps = matrixData.dependencies[row][col];
    if (!deps || deps.length === 0) return;
    
    // Map dependencies to actual graph element IDs
    const highlighted = new Set();
    deps.forEach(dep => {
      if (dep.left) {
        const node = $graph.getElementAt(dep.left.matrix, dep.left.row, dep.left.col);
        if (node) highlighted.add(node.id);
      }
      if (dep.right) {
        const node = $graph.getElementAt(dep.right.matrix, dep.right.row, dep.right.col);
        if (node) highlighted.add(node.id);
      }
    });
    highlightedElements.set(highlighted);
  }
  
  function handleMouseLeave() {
    hoveredCell = null;
    highlightedElements.set(new Set());
  }
  
  function isHighlighted(row, col) {
    // A Python cell is highlighted if any dependency is highlighted
    return hoveredCell && hoveredCell.row === row && hoveredCell.col === col;
  }

  function getCellColors(row, col) {
    if (!hasData || !matrixData.dependencies) return [];
    const deps = matrixData.dependencies[row][col];
    if (!deps || deps.length === 0) return [];
    
    const colors = new Set();
    deps.forEach(dep => {
      if (dep.left) {
        const node = $graph.getElementAt(dep.left.matrix, dep.left.row, dep.left.col);
        if (node?.color) colors.add(node.color);
      }
      if (dep.right) {
        const node = $graph.getElementAt(dep.right.matrix, dep.right.row, dep.right.col);
        if (node?.color) colors.add(node.color);
      }
    });
    return Array.from(colors).slice(0, 9);
  }
</script>

  <div class="matrix-container">
  {#if label}
    <div class="label">{@html label}</div>
  {/if}
  
  {#if hasData}
      <div class="matrix-wrapper" style={`--matrix-scale:${scale}; --cell-size:${cellSize}px; --cell-gap:${cellGap}px;`}>
        <table class="python-matrix" class:graybg={grayBackground}>
        <tbody>
          {#each matrixData.data as row, i}
            <tr>
              {#each row as value, j}
                <td
                  class="cell"
                  class:has-value={value !== 0}
                  class:highlighted={isHighlighted(i, j)}
                  on:mouseenter={() => handleMouseEnter(i, j)}
                  on:mouseleave={handleMouseLeave}
                >
                  {#if value !== 0}
                    <div class="cell-content">
                      <div class="colors">
                        {#each getCellColors(i, j) as color}
                          <div class="color-block" style="background-color: {color}"></div>
                        {/each}
                      </div>
                      <div class="value">{value.toFixed(0)}</div>
                    </div>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon">🐍</div>
      <div class="empty-text">Run Python code to see O(py)</div>
    </div>
  {/if}
</div>

<style>
  .matrix-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .label {
    font-weight: bold;
    margin-bottom: 6px;
    font-size: 15px;
  }
  
  .label {
    font-weight: bold;
    margin-bottom: 6px;
    font-size: 15px;
  }
  
  .matrix-wrapper {
    display: flex;
    padding: 8px;
  }

  .python-matrix {
    border-collapse: separate;
    border-spacing: var(--cell-gap, 3px);
    transform: scale(var(--matrix-scale));
    transform-origin: center center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-radius: 10px;
    overflow: visible;
    background: #f3f4f6;
    padding: 4px;
  }

  .python-matrix.graybg :global(td) {
    background: #f5f5f5;
  }

  .python-matrix.graybg :global(td:hover) {
    background: #e8e8e8;
  }
  
  .cell {
    width: var(--cell-size);
    height: var(--cell-size);
    background: #fcfcfc;
    border: none;
    position: relative;
    transition: transform 0.08s ease, box-shadow 0.08s ease, outline-color 0.08s ease;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
    border-radius: 6px;
    cursor: pointer;
  }
  
  .cell.has-value {
    background: #f7f7f7;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  }
  
  .cell.highlighted {
    box-shadow: 0 0 0 3px #ff3333,
                0 0 12px rgba(255, 51, 51, 0.55);
    background: #fff2f2;
    z-index: 6;
  }
  
  .cell:hover {
    transform: scale(1.04);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12),
                inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    z-index: 10;
  }
  
  .cell-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2px;
  }
  
  .colors {
    display: flex;
    gap: 1px;
    margin-bottom: 2px;
  }
  
  .color-block {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    border: 1px solid rgba(0,0,0,0.15);
  }
  
  .value {
    font-size: 11px;
    font-weight: 600;
    color: #1f2937;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    background: #f9fafb;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    min-width: 200px;
    min-height: 150px;
  }
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
  }
  
  .empty-text {
    font-size: 13px;
    color: #6b7280;
    text-align: center;
  }
</style>
