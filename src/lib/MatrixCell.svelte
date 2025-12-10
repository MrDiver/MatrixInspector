<script>
  import { highlightElement, togglePersistentSelection, clearHighlights, highlightedElements, persistentSelections, persistentSelectionSources } from '../lib/stores';
  import MatrixCellContent from './MatrixCellContent.svelte';
  
  export let element;
  export let paintable = false;
  export let showMiniBlocks = false;
  export let anyHighlighted = false;
  export let onPaint = null;
  export let matrixName = ''; // Track which matrix this cell belongs to
  export let isDragging = false; // Bound from parent for shared drag state
  
  $: isHighlighted = $highlightedElements.has(element.id);
  $: hasValue = element.value !== 0;
  $: isIdentity = element.isIdentity === true;
  $: shouldDim = anyHighlighted && !isHighlighted;
  $: isNewlyFilled = hasValue && previousHadValue === false;
  
  let previousHadValue = false;
  let isAnimating = false;
  let wasHighlighted = false;
  let isHighlightAnimating = false;
  
  $: {
    if (hasValue && !previousHadValue) {
      isAnimating = true;
      previousHadValue = true;
      // Reset animation state after it completes
      setTimeout(() => {
        isAnimating = false;
      }, 450);
    } else if (!hasValue) {
      previousHadValue = false;
    }
  }
  
  $: {
    if (isHighlighted && !wasHighlighted) {
      isHighlightAnimating = true;
      wasHighlighted = true;
      setTimeout(() => {
        isHighlightAnimating = false;
      }, 500);
    } else if (!isHighlighted) {
      wasHighlighted = false;
    }
  }
  
  // Determine identity badge color based on cell color brightness
  $: identityBadgeColor = (() => {
    if (!element.color) return 'inherit'; // Use CSS default if no color
    
    // Parse hex color and calculate brightness
    const hex = element.color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance using relative luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // If color is dark (luminance < 0.5), use white text, otherwise use dark text
    return luminance < 0.5 ? 'white' : 'rgba(40, 40, 40, 0.8)';
  })();
  
  let isTouching = false;
  
  function handleClick(event) {
    // For paint mode
    if (paintable && onPaint) {
      onPaint(element.row, element.col);
      return;
    }
    
    // Support multi-select with Ctrl/Cmd+Click on any matrix with miniBlocks or O matrix
    if (hasValue && (event.ctrlKey || event.metaKey) && (showMiniBlocks || matrixName === 'O')) {
      event.preventDefault();
      togglePersistentSelection(element.id);
    }
  }
  
  function handleMouseDown(event) {
    // Only start drag if Ctrl/Cmd is pressed and we're on a multi-select enabled matrix
    if ((event.ctrlKey || event.metaKey) && hasValue && (showMiniBlocks || matrixName === 'O')) {
      isDragging = true;
      event.preventDefault();
    }
  }
  
  function handleMouseEnter(event) {
    // If dragging, add this cell to selection (only if not already selected)
    if (isDragging && hasValue && (event.ctrlKey || event.metaKey) && (showMiniBlocks || matrixName === 'O')) {
      // Only toggle if not already in persistent selections
      if (!$persistentSelections.has(element.id)) {
        togglePersistentSelection(element.id);
      }
    }
  }
  
  function handleMouseUp() {
    isDragging = false;
  }
  
  function handleMouseOver() {
    if (hasValue && !isTouching) {
      if ($persistentSelectionSources.size > 0) {
        return; // Preserve persistent highlights during hover
      }
      // For matrices with multi-select: preserve persistent selections while hovering
      if (showMiniBlocks || matrixName === 'O') {
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
      if ($persistentSelectionSources.size > 0) {
        highlightedElements.set(new Set($persistentSelections));
        return;
      }
      // For matrices with multi-select: restore persistent selections
      if (showMiniBlocks || matrixName === 'O') {
        highlightedElements.set(new Set($persistentSelections));
      } else {
        // Other matrices: clear all highlights
        clearHighlights();
      }
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
  class:identity={isIdentity}
  class:fill-in={isAnimating}
  class:highlight-pop={isHighlightAnimating}
  data-has-value={hasValue}
  data-id={element.id}
  on:click={handleClick}
  on:mousedown={handleMouseDown}
  on:mouseenter={handleMouseEnter}
  on:mouseup={handleMouseUp}
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
  style:--identity-badge-color={identityBadgeColor}
  role={paintable ? 'button' : 'cell'}
  tabindex={paintable ? 0 : -1}
>
  <MatrixCellContent {element} {showMiniBlocks} {hasValue} />
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
  
  /* Identity element visual indicator */
  td.identity {
    border: 1px dashed rgba(150, 150, 150, 0.4);
    position: relative;
  }

  td.identity:not(.dimmed) {
    opacity: 0.85;
  }

  td.identity.dimmed {
    opacity: 0.3;
  }

  :global(html.dark) td.identity {
    border-color: rgba(200, 200, 200, 0.3);
  }

  /* Display "1" badge for identity elements - centered */
  td.identity::before {
    content: '1';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 12px;
    font-weight: bold;
    color: var(--identity-badge-color, rgba(60, 60, 60, 0.5));
    line-height: 1;
    pointer-events: none;
    z-index: 2;
    text-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
  }

  :global(html.dark) td.identity::before {
    color: var(--identity-badge-color, rgba(200, 200, 200, 0.6));
    text-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
  }

  /* Dot indicator */
  td.identity::after {
    content: '';
    position: absolute;
    top: 2px;
    right: 2px;
    width: 3px;
    height: 3px;
    background: rgba(100, 100, 100, 0.6);
    border-radius: 50%;
  }

  :global(html.dark) td.identity::after {
    background: rgba(180, 180, 180, 0.5);
  }

  /* Fill-in animation for newly painted cells */
  @keyframes cellGrowIn {
    0% {
      transform: scale(0.4);
      opacity: 0;
      filter: blur(3px);
    }
    50% {
      transform: scale(1.12);
    }
    100% {
      transform: scale(1);
      opacity: 1;
      filter: blur(0px);
    }
  }

  @keyframes cellGlowPulse {
    0% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--cell-base) 100%, transparent),
                  0 0 0 1px rgba(0, 0, 0, 0.06);
    }
    50% {
      box-shadow: 0 0 4px 1px color-mix(in srgb, var(--cell-base) 40%, transparent),
                  0 0 0 1px rgba(0, 0, 0, 0.06);
    }
    100% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--cell-base) 0%, transparent),
                  0 0 0 1px rgba(0, 0, 0, 0.06);
    }
  }

  td.fill-in {
    animation: cellGrowIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
               cellGlowPulse 0.45s ease-out forwards;
  }

  /* Highlight pop animation for first-time highlighting */
  @keyframes highlightPop {
    0% {
      transform: scale(1) rotate(0deg);
    }
    50% {
      transform: scale(1.08) rotate(-5deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
    }
  }

  td.highlight-pop {
    animation: highlightPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
</style>
