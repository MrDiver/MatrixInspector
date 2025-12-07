<script>
  import { currentColor, PRESET_COLORS } from '../lib/stores';
  
  function selectColor(color) {
    currentColor.set(color);
  }
</script>

<div class="color-picker-container">
  <input
    id="colorPicker"
    type="color"
    bind:value={$currentColor}
    title="Custom Color"
  />
  
  <div class="presets">
    {#each PRESET_COLORS as color}
      <div
        class="color-swatch"
        class:active={$currentColor === color}
        style:background={color}
        on:click={() => selectColor(color)}
        on:keypress={(e) => e.key === 'Enter' && selectColor(color)}
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
  
  input[type="color"] {
    width: 32px;
    height: 32px;
    border: 2px solid var(--border-color);
    background: var(--bg-secondary);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
    touch-action: manipulation;
  }
  
  input[type="color"]:hover {
    border-color: var(--primary-blue);
    box-shadow: 0 0 0 3px var(--input-focus-shadow);
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
