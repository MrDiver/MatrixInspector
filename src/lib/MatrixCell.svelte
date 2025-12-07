<script>
  import { highlightElement, togglePersistentSelection, clearHighlights, highlightedElements, persistentSelections } from '../lib/stores';
  
  export let element;
  export let paintable = false;
  export let showMiniBlocks = false;
  export let anyHighlighted = false;
  export let onPaint = null;
  export let matrixName = ''; // Track which matrix this cell belongs to
  
  $: isHighlighted = $highlightedElements.has(element.id);
  $: hasValue = element.value !== 0;
  $: shouldDim = anyHighlighted && !isHighlighted;
  
  let isTouching = false;
  
  function handleClick(event) {
    // For paint mode
    if (paintable && onPaint) {
      onPaint(element.row, element.col);
      return;
    }
    
    // For O matrix: support multi-select with Ctrl/Cmd+Click
    if (matrixName === 'O' && hasValue && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      togglePersistentSelection(element.id);
    }
  }
  
  function handleMouseOver() {
    if (hasValue && !isTouching) {
      // In O matrix: preserve persistent selections while hovering
      if (matrixName === 'O') {
        // Add hover highlight to persistent selections temporarily
        const hasPersistent = $persistentSelections.size > 0;
        if (!hasPersistent) {
          // Only use normal hover if no persistent selections
          highlightElement(element.id);
        }
      } else {
        // Other matrices: normal hover behavior
        highlightElement(element.id);
      }
    }
  }

  function handleMouseLeave() {
    if (!isTouching) {
      if (matrixName === 'O') {
        // In O matrix: restore persistent selections
        highlightedElements.set(new Set($persistentSelections));
      } else {
        // Other matrices: clear all highlights
        clearHighlights();
      }
    }
  }  function handleTouchStart() {
    isTouching = true;
    if (paintable && onPaint) {
      onPaint(element.row, element.col);
    }
    if (hasValue) {
      highlightElement(element.id);
    }
  }

  function handleTouchEnd() {
    isTouching = false;
    clearHighlights();
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
</script>

<td
  class:paintable
  class:highlight={isHighlighted}
  class:miniblocks={showMiniBlocks && hasValue}
  class:dimmed={shouldDim}
  data-has-value={hasValue}
  data-id={element.id}
  on:click={handleClick}
  on:mouseover={handleMouseOver}
  on:mouseleave={handleMouseLeave}
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
  on:focus={handleMouseOver}
  on:blur={handleMouseLeave}
  style:--cell-base={hasValue
    ? (showMiniBlocks ? 'var(--matrix-cell-bg)' : (element.color || 'var(--color-primary)'))
    : 'var(--matrix-cell-bg)'}
  style:--cell-highlight={hasValue ? (element.color || 'var(--color-primary)') : 'var(--color-rose)'}
  role={paintable ? 'button' : 'cell'}
  tabindex={paintable ? 0 : -1}
>
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
</td>

<style>
  td {
    width: var(--cell-size, 32px);
    height: var(--cell-size, 32px);
    border: none;
    position: relative;
    transition: transform 0.08s ease, box-shadow 0.08s ease, outline-color 0.08s ease;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
    border-radius: 6px;
    background: var(--cell-base, var(--matrix-cell-bg));
    opacity: 1;
    transition: transform 0.08s ease, box-shadow 0.3s ease, outline-color 0.08s ease, opacity 0.15s ease, background 0.3s ease;
    --mini-size: calc(var(--cell-size, 32px) * 0.22);
    --mini-step: calc(var(--cell-size, 32px) * 0.25);
    --mini-offset: calc(var(--cell-size, 32px) * 0.06);
    touch-action: manipulation;
  }

  :global(html.dark) td {
    background: var(--cell-base, var(--matrix-cell-bg));
    box-shadow: none;
  }

  /* Miniblock matrices should stay neutral (no per-cell colors) */
  :global(td.miniblocks) {
    background: var(--matrix-cell-bg) !important;
  }

  :global(html.dark) td.miniblocks {
    background: var(--matrix-cell-bg) !important;
  }
  
  
  /* Dim non-highlighted cells when any cell is highlighted */
  td.dimmed {
    opacity: 0.35;
    transition: opacity 0.3s ease;
  }

  td:not(.dimmed) {
    transition: opacity 0.3s ease;
  }

  td.paintable {
    cursor: pointer;
  }
  
  td.paintable:hover {
    transform: scale(1.04);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12),
                inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    z-index: 10;
  }

  :global(html.dark) td.paintable:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  @media (hover: none) {
    /* Touch devices - reduce transform to avoid jank */
    td.paintable:active {
      transform: scale(0.98);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1),
                  inset 0 0 0 1px rgba(0, 0, 0, 0.08);
      z-index: 10;
    }

    :global(html.dark) td.paintable:active {
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }
  }
  
  td.highlight {
    opacity: 1 !important;
    box-shadow: inset 0 0 0 3px var(--cell-highlight),
                0 0 12px color-mix(in srgb, var(--cell-highlight) 70%, transparent);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--cell-highlight) 85%, var(--bg-primary) 15%),
      color-mix(in srgb, var(--cell-highlight) 60%, black 40%)
    );
    z-index: 6;
  }

  :global(html.dark) td.highlight {
    box-shadow: inset 0 0 0 3px var(--cell-highlight),
                0 0 12px color-mix(in srgb, var(--cell-highlight) 75%, transparent);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--cell-highlight) 82%, var(--bg-primary) 18%),
      color-mix(in srgb, var(--cell-highlight) 55%, black 45%)
    );
  }
  
  .mini {
    width: var(--mini-size);
    height: var(--mini-size);
    position: absolute;
    border: max(0.5px, calc(var(--cell-size, 32px) * 0.03)) solid rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
    border-radius: 1px;
  }

  :global(html.dark) .mini {
    border-color: rgba(255, 255, 255, 0.25);
  }
</style>
