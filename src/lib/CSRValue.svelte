<script>
  import { highlightElement, clearHighlights, highlightedElements, graph } from '../lib/stores';
  
  export let elementId;
  export let colors = [];
  
  $: isHighlighted = $highlightedElements.has(elementId);
  
  function handleMouseOver() {
    highlightElement(elementId);
  }
  
  function handleMouseLeave() {
    clearHighlights();
  }
</script>

<div
  class="csr-value-container"
  class:csr-highlight={isHighlighted}
  data-element-id={elementId}
  on:mouseover={handleMouseOver}
  on:mouseleave={handleMouseLeave}
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
    width: 26px;
    height: 26px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .csr-value-container:hover {
    transform: scale(1.1);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8),
                0 0 8px rgba(0, 0, 0, 0.2);
    z-index: 10;
  }
  
  .csr-value-container.csr-highlight {
    box-shadow: 0 0 0 3px #ff3333,
                0 0 8px rgba(255, 51, 51, 0.5);
    z-index: 5;
  }
  
  .mini-block {
    width: 8px;
    height: 8px;
    border: 1px solid rgba(0, 0, 0, 0.14);
    box-sizing: border-box;
  }
</style>
