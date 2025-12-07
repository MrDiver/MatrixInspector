<script>
  import CSRValue from './CSRValue.svelte';
  import { getCSRData, graph } from '../lib/stores';
  
  export let matrixName;
  export let label = '';
  
  $: csrData = getCSRData(matrixName);

  // Format label with italic styling for matrix variables
  $: formattedLabel = (label || matrixName).replace(/\b([SKO])\b/g, '<i>$1</i>')
                                           .replace(/\b(S_left|S_right|KS)\b/g, (match) => {
                                             if (match === 'S_left') return '<i>S</i>_left';
                                             if (match === 'S_right') return '<i>S</i>_right';
                                             if (match === 'KS') return '<i>KS</i>';
                                             return match;
                                           });
  
  // Get colors for each value element
  $: valueElements = $csrData?.elementIds.map((id, idx) => {
    const element = $graph.getNode(id);
    const colors = [];
    
    // Add own color if present
    if (element?.color) {
      colors.push(element.color);
    }
    
    // Add dependency colors
    if (element?.dependencies) {
      for (const depId of element.dependencies) {
        const depElem = $graph.getNode(depId);
        if (depElem?.color) {
          colors.push(depElem.color);
        }
      }
    }
    
    return {
      id,
      colors: colors.length > 0 ? colors : ['#000000']
    };
  }) || [];
</script>

<div class="csr-matrix">
  <span class="csr-title">{@html formattedLabel}</span>
  
  {#if $csrData}
    <span class="csr-label">row_offsets:</span>
    <div class="csr-list">
      {#each $csrData.row_offsets as value}
        <div class="csr-item">{value}</div>
      {/each}
    </div>
    
    <span class="csr-label">col_indices:</span>
    <div class="csr-list">
      {#each $csrData.col_indices as value}
        <div class="csr-item">{value}</div>
      {/each}
    </div>
    
    <span class="csr-label">values:</span>
    <div class="csr-list">
      {#each valueElements as { id, colors }}
        <CSRValue elementId={id} {colors} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .csr-matrix {
    display: flex;
    flex-direction: column;
  }
  
  .csr-title {
    font-weight: bold;
    margin-bottom: 8px;
    font-size: 1.1em;
    color: var(--text-primary);
  }

  .csr-title :global(i) {
    font-family: 'Times New Roman', 'Cambria Math', serif;
    font-style: italic;
    font-size: 1.15em;
    letter-spacing: 0.5px;
  }
  
  .csr-label {
    font-weight: 500;
    margin-top: 4px;
    margin-bottom: 4px;
    color: var(--text-secondary);
  }
  
  .csr-list {
    display: flex;
    gap: 4px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }
  
  .csr-item {
    padding: 4px 6px;
    border-radius: 4px;
    text-align: center;
    min-width: 22px;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }
</style>
