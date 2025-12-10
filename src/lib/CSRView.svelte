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
    <div class="csr-section">
      <div class="csr-subsection">
        <span class="csr-label">row_offsets:</span>
        <div class="csr-list">
          {#each $csrData.row_offsets as value}
            <div class="csr-item">{value}</div>
          {/each}
        </div>
      </div>
      
      <div class="csr-subsection">
        <span class="csr-label">col_indices:</span>
        <div class="csr-list">
          {#each $csrData.col_indices as value}
            <div class="csr-item">{value}</div>
          {/each}
        </div>
      </div>
      
      <div class="csr-subsection">
        <span class="csr-label">values:</span>
        <div class="csr-list">
          {#each valueElements as { id, colors }}
            <CSRValue elementId={id} {colors} />
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .csr-matrix {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    background: color-mix(in srgb, var(--bg-tertiary) 55%, transparent);
    backdrop-filter: blur(10px);
    border: 1px solid color-mix(in srgb, var(--border-color) 60%, transparent);
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global(html.dark) .csr-matrix {
    background: color-mix(in srgb, var(--bg-tertiary) 40%, transparent);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .csr-matrix:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }

  :global(html.dark) .csr-matrix:hover {
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }
  
  .csr-title {
    font-weight: 700;
    margin-bottom: 8px;
    font-size: 0.95em;
    color: var(--text-primary);
    letter-spacing: 0.02em;
    text-transform: uppercase;
    opacity: 0.9;
  }

  .csr-title :global(i) {
    font-family: 'Times New Roman', 'Cambria Math', serif;
    font-style: italic;
    font-size: 1.15em;
    letter-spacing: 0.5px;
    opacity: 1;
  }

  .csr-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .csr-subsection {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .csr-label {
    font-weight: 600;
    font-size: 0.85em;
    color: color-mix(in srgb, var(--text-secondary) 85%, transparent);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.75;
  }
  
  .csr-list {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  
  .csr-item {
    padding: 5px 8px;
    border-radius: 5px;
    text-align: center;
    min-width: 24px;
    font-size: 0.9em;
    font-weight: 500;
    background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
    color: var(--text-primary);
    border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
    transition: all 0.2s ease;
    backdrop-filter: blur(6px);
    animation: fadeIn 0.4s ease-out forwards;
  }

  .csr-item:hover {
    transform: scale(1.08) translateY(-2px);
    background: color-mix(in srgb, var(--bg-secondary) 85%, transparent);
    border-color: color-mix(in srgb, var(--text-secondary) 40%, transparent);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  :global(html.dark) .csr-item:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
