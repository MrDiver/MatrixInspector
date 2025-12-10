<script>
  /**
   * MatrixCellContent - Renders cell content in two modes:
   * - Mini block mode: Shows dependency colors as small blocks
   * - Full mode: Shows single cell color
   */
  
  export let element;
  export let showMiniBlocks = false;
  export let hasValue = false;
  
  let isAnimating = false;
  let previousHasValue = false;
  
  $: {
    if (hasValue && !previousHasValue) {
      isAnimating = true;
      previousHasValue = true;
      setTimeout(() => {
        isAnimating = false;
      }, 500);
    } else if (!hasValue) {
      previousHasValue = false;
    }
  }

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
  <div class="mini-container" class:animating={isAnimating}>
    {#each miniBlockColors as color, idx}
      <div
        class="mini"
        class:animate={isAnimating}
        style:background={color}
        style:--block-index={idx}
      ></div>
    {/each}
  </div>
{/if}

<style>
  .mini-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: calc(var(--cell-size, 32px) * 0.04);
    padding: calc(var(--cell-size, 32px) * 0.06);
    box-sizing: border-box;
  }

  .mini {
    position: relative;
    border-radius: 2px;
    width: var(--mini-size);
    height: var(--mini-size);
    z-index: 2;
    border: max(0.5px, calc(var(--cell-size, 32px) * 0.03)) solid rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
    border-radius: 1px;
    flex: 0 0 calc(33.333% - calc(var(--cell-size, 32px) * 0.04));
    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  :global(html.dark) .mini {
    border-color: rgba(255, 255, 255, 0.25);
  }

  /* Mini-block cascade animation */
  @keyframes miniBlockPopIn {
    0% {
      transform: scale(0) rotate(-180deg);
      opacity: 0;
    }
    70% {
      transform: scale(1.15) rotate(10deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }

  .mini.animate {
    animation: miniBlockPopIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    animation-delay: calc(var(--block-index, 0) * 0.08s);
  }
</style>
