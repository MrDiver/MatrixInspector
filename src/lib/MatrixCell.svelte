<script>
  import { highlightElement, clearHighlights, highlightedElements } from '../lib/stores';
  
  export let element;
  export let paintable = false;
  export let showMiniBlocks = false;
  export let onPaint = null;
  
  $: isHighlighted = $highlightedElements.has(element.id);
  $: hasValue = element.value !== 0;
  
  let isTouching = false;
  
  function handleClick() {
    if (paintable && onPaint) {
      onPaint(element.row, element.col);
    }
  }
  
  function handleMouseOver() {
    if (hasValue && !isTouching) {
      highlightElement(element.id);
    }
  }
  
  function handleMouseLeave() {
    if (!isTouching) {
      clearHighlights();
    }
  }

  function handleTouchStart() {
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
    setTimeout(() => clearHighlights(), 200);
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
  data-id={element.id}
  on:click={handleClick}
  on:mouseover={handleMouseOver}
  on:mouseleave={handleMouseLeave}
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
  on:focus={handleMouseOver}
  on:blur={handleMouseLeave}
  style:background={hasValue
    ? (showMiniBlocks ? 'var(--matrix-cell-filled-bg)' : (element.color || 'var(--color-primary)'))
    : ''}
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
    background: var(--matrix-cell-bg);
    --mini-size: calc(var(--cell-size, 32px) * 0.22);
    --mini-step: calc(var(--cell-size, 32px) * 0.25);
    --mini-offset: calc(var(--cell-size, 32px) * 0.06);
    touch-action: manipulation;
  }

  :global(html.dark) td {
    background: var(--matrix-cell-bg);
    box-shadow: none;
  }

  :global(html.dark) td.miniblocks {
    background: var(--matrix-cell-filled-bg) !important;
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
    box-shadow: 0 0 0 3px var(--color-rose),
                0 0 12px color-mix(in srgb, var(--color-rose) 70%, transparent);
    background: color-mix(in srgb, var(--color-rose) 18%, var(--bg-primary));
    z-index: 6;
  }

  :global(html.dark) td.highlight {
    box-shadow: 0 0 0 3px var(--color-rose),
                0 0 12px color-mix(in srgb, var(--color-rose) 75%, transparent);
    background: color-mix(in srgb, var(--color-rose) 20%, var(--bg-primary));
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
