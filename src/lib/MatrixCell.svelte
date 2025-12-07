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
    ? (showMiniBlocks ? '#f7f7f7' : (element.color || '#4CAF50'))
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
    background: var(--bg-tertiary, #fcfcfc);
    --mini-size: calc(var(--cell-size, 32px) * 0.22);
    --mini-step: calc(var(--cell-size, 32px) * 0.25);
    --mini-offset: calc(var(--cell-size, 32px) * 0.06);
    touch-action: manipulation;
  }

  :global(html.dark) td {
    background: #1a1a1a;
    box-shadow: none;
  }

  :global(html.dark) td.miniblocks {
    background: #2a2a2a !important;
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
    box-shadow: 0 0 0 3px #fa709a,
                0 0 12px rgba(250, 112, 154, 0.55);
    background: #fff2f2;
    z-index: 6;
  }

  :global(html.dark) td.highlight {
    box-shadow: 0 0 0 3px #fa709a,
                0 0 12px rgba(250, 112, 154, 0.6);
    background: #3a1a2a;
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
