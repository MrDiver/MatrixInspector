<script>
  /**
   * MatrixCellContent - Renders cell content in two modes:
   * - Mini block mode: Shows dependency colors as small blocks
   * - Full mode: Shows single cell color
   */
  
  export let element;
  export let showMiniBlocks = false;
  export let hasValue = false;

  // Get colors for mini blocks
  $: miniBlockColors = (() => {
    if (!showMiniBlocks || !hasValue) return [];
    
    // For derived matrices, use the pre-computed dependency colors
    if (element.dependencyColors && element.dependencyColors.length > 0) {
      return element.dependencyColors.slice(0, 9);
    }
    
    // For base matrices, show own color
    return element.color ? [element.color] : [];
  })();

  // Get background color based on mode
  $: backgroundColor = (() => {
    if (!hasValue) return 'var(--matrix-cell-bg)';
    if (showMiniBlocks) return 'var(--matrix-cell-bg)';
    return element.color || 'var(--color-primary)';
  })();
</script>

{#if showMiniBlocks && miniBlockColors.length > 0}
  {#each miniBlockColors as color, idx}
    <div
      class="mini"
      style:background={color}
      style:right={`calc(var(--mini-offset) + ${(idx % 3)} * var(--mini-step))`}
      style:bottom={`calc(var(--mini-offset) + ${Math.floor(idx / 3)} * var(--mini-step))`}
    ></div>
  {/each}
{/if}

<style>
  .mini {
    position: absolute;
    border-radius: 2px;
    width: var(--mini-size);
    height: var(--mini-size);
    z-index: 2;
    border: max(0.5px, calc(var(--cell-size, 32px) * 0.03)) solid rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
    border-radius: 1px;
  }

  :global(html.dark) .mini {
    border-color: rgba(255, 255, 255, 0.25);
  }
</style>
