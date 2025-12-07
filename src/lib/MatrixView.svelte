<script>
  import MatrixCell from './MatrixCell.svelte';
  import { getMatrixData, toggleElement, currentColor, graph } from '../lib/stores';
  
  export let matrixName;
  export let label = '';
  export let paintable = false;
  export let showMiniBlocks = false;
  export let grayBackground = false;
  
  $: matrixData = getMatrixData(matrixName);

  // Format label with italic styling for matrix variables
  $: formattedLabel = label.replace(/\b([SKO])\b/g, '<i>$1</i>')
                           .replace(/\b(S_left|S_right|KS)\b/g, (match) => {
                             if (match === 'S_left') return '<i>S</i> (Left)';
                             if (match === 'S_right') return '<i>S</i> (Right)';
                             if (match === 'KS') return '<i>KS</i>';
                             return match;
                           });

  const computeScale = (size) => {
    if (!size) return 1;
    if (size <= 12) return 1;
    return Math.max(0.4, 12 / size);
  };

  $: rowCount = $matrixData.length;
  $: colCount = $matrixData[0]?.length || 0;
  $: maxDim = Math.max(rowCount, colCount);
  $: scale = computeScale(maxDim);
  $: cellSize = 32 * scale;
  $: cellGap = Math.max(1, 3 * scale);
  
  function handlePaint(row, col) {
    if (paintable) {
      let color;
      currentColor.subscribe(c => color = c)();
      toggleElement(matrixName, row, col, color);
    }
  }
  
  // Get actual element objects from graph
  $: elements = $matrixData.map(row => 
    row.map(elem => {
      // Get dependencies with colors
      const deps = elem.dependencies.map(depId => {
        const depElem = $graph.getNode(depId);
        return depElem?.color || '#000000';
      });
      
      return {
        ...elem,
        dependencyColors: deps
      };
    })
  );
</script>

<div class="matrix-container">
  {#if label}
    <div class="label">{@html formattedLabel}</div>
  {/if}
  <div class="matrix-wrapper" style={`--matrix-scale:${scale}; --cell-size:${cellSize}px; --cell-gap:${cellGap}px;`}>
    <table class:graybg={grayBackground}>
      <tbody>
        {#each elements as row}
          <tr>
            {#each row as element}
              <MatrixCell
                {element}
                {paintable}
                {showMiniBlocks}
                onPaint={handlePaint}
              />
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
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
    color: var(--text-primary);
  }

  .label :global(i) {
    font-family: 'Times New Roman', 'Cambria Math', serif;
    font-style: italic;
    font-size: 17px;
    letter-spacing: 0.5px;
  }
  
  .matrix-wrapper {
    display: flex;
    padding: 8px;
  }
  
  table {
    border-collapse: separate;
    border-spacing: var(--cell-gap, 3px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-radius: 10px;
    overflow: visible;
    background: #f3f4f6;
    padding: 4px;
  }

  :global(html.dark) table {
    background: #3a3a3a;
  }
  
  table.graybg :global(td:not([style*="background"])) {
    background: #f5f5f5;
  }

  :global(html.dark) table.graybg :global(td:not([style*="background"])) {
    background: #262626 !important;
  }
  
  table.graybg :global(td:hover:not([style*="background"])) {
    background: #e8e8e8;
  }

  :global(html.dark) table.graybg :global(td:hover:not([style*="background"])) {
    background: #303030 !important;
  }
</style>
