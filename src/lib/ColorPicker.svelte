<script>
  import { currentColorIndex } from '../lib/stores';
  import { currentPalette } from '../lib/themeStore';

  function selectColor(idx, paletteLength) {
    const safeIdx = Math.max(0, idx % Math.max(1, paletteLength));
    currentColorIndex.set(safeIdx);
  }
</script>

<div class="color-picker-container">
  <div class="presets">
    {#each $currentPalette.slice(0, 10) as color, idx}
      <div
        class="color-swatch"
        class:active={$currentColorIndex === idx}
        style:background={color}
        on:click={() => selectColor(idx, $currentPalette.length)}
        on:keypress={(e) => e.key === 'Enter' && selectColor(idx, $currentPalette.length)}
        role="button"
        tabindex="0"
        title={color}
      ></div>
    {/each}
  </div>
</div>

<style>
  .color-picker-container {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .presets {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  
  .color-swatch {
    width: 26px;
    height: 26px;
    border: 2px solid transparent;
    cursor: pointer;
    border-radius: 5px;
    transition: all 0.15s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    position: relative;
    touch-action: manipulation;
  }

  .color-swatch.active {
    border-color: var(--text-primary);
    box-shadow: 0 0 0 2px var(--primary-blue);
  }
  
  .color-swatch:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 10;
  }
  
  .color-swatch:active {
    transform: scale(1.0);
  }
</style>
