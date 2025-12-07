<script>
  import { highlightElement, clearHighlights, highlightedElements } from '../lib/stores';
  
  export let element;
  export let paintable = false;
  export let showMiniBlocks = false;
  export let onPaint = null;
  
  $: isHighlighted = $highlightedElements.has(element.id);
  $: hasValue = element.value !== 0;
  
  function handleClick() {
    if (paintable && onPaint) {
      onPaint(element.row, element.col);
    }
  }
  
  function handleMouseOver() {
    if (hasValue) {
      highlightElement(element.id);
    }
  }
  
  function handleMouseLeave() {
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
  data-id={element.id}
  on:click={handleClick}
  on:mouseover={handleMouseOver}
  on:mouseleave={handleMouseLeave}
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
    background: #fcfcfc;
    --mini-size: calc(var(--cell-size, 32px) * 0.22);
    --mini-step: calc(var(--cell-size, 32px) * 0.25);
    --mini-offset: calc(var(--cell-size, 32px) * 0.06);
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
  
  td.highlight {
    box-shadow: 0 0 0 3px #ff3333,
                0 0 12px rgba(255, 51, 51, 0.55);
    background: #fff2f2;
    z-index: 6;
  }
  
  .mini {
    width: var(--mini-size);
    height: var(--mini-size);
    position: absolute;
    border: max(0.5px, calc(var(--cell-size, 32px) * 0.03)) solid rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
    border-radius: 1px;
  }
</style>
