<script>
  import { highlightElement, clearHighlights, highlightedElements, graph } from '../lib/stores';
  
  export let elementId;
  export let colors = [];
  
  $: isHighlighted = $highlightedElements.has(elementId);
  
  let isTouching = false;

  function handleMouseOver() {
    if (!isTouching) {
      highlightElement(elementId);
    }
  }
  
  function handleMouseLeave() {
    if (!isTouching) {
      clearHighlights();
    }
  }

  function handleTouchStart() {
    isTouching = true;
    highlightElement(elementId);
  }

  function handleTouchEnd() {
    isTouching = false;
    setTimeout(() => clearHighlights(), 200);
  }
</script>

<div
  class="csr-value-container"
  class:csr-highlight={isHighlighted}
  data-element-id={elementId}
  on:mouseover={handleMouseOver}
  on:mouseleave={handleMouseLeave}
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
  on:focus={handleMouseOver}
  on:blur={handleMouseLeave}
  role="button"
  tabindex="0"
>
  {#each colors.slice(0, 9) as color, idx}
    <div
      class="mini-block"
      style:background={color}
    ></div>
  {/each}
</div>

<style>
  .csr-value-container {
    padding: 0;
    min-width: auto;
    display: flex;
    gap: 1px;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    touch-action: manipulation;
  }
  
  .csr-value-container:hover {
    transform: scale(1.1);
    box-shadow: 0 0 0 2px var(--bg-primary),
                0 0 8px rgba(0, 0, 0, 0.2);
    z-index: 10;
  }

  @media (hover: none) {
    .csr-value-container:active {
      transform: scale(0.95);
      box-shadow: 0 0 0 2px var(--bg-primary),
                  0 0 4px rgba(0, 0, 0, 0.1);
      z-index: 10;
    }
  }
  
  .csr-value-container.csr-highlight {
    box-shadow: 0 0 0 3px var(--color-rose),
                0 0 12px color-mix(in srgb, var(--color-rose) 70%, transparent),
                0 0 24px color-mix(in srgb, var(--color-rose) 40%, transparent);
    z-index: 10;
    animation: highlightRotatePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  :global(html.dark) .csr-value-container.csr-highlight {
    box-shadow: 0 0 0 3px var(--color-rose),
                0 0 16px color-mix(in srgb, var(--color-rose) 70%, transparent),
                0 0 32px color-mix(in srgb, var(--color-rose) 40%, transparent);
  }

  @keyframes highlightRotatePop {
    0% {
      transform: scale(1) rotate(0deg);
    }
    50% {
      transform: scale(1.22) rotate(-5deg);
    }
    100% {
      transform: scale(1.15) rotate(0deg);
    }
  }
  
  .mini-block {
    width: 8px;
    height: 8px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    box-sizing: border-box;
  }
</style>