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
  }
  
  input[type="color"] {
    width: 32px;
    height: 32px;
    border: 2px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
  }
  
  input[type="color"]:hover {
    border-color: #4363d8;
    box-shadow: 0 0 0 3px rgba(67, 99, 216, 0.15);
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
  }

  .color-swatch.active {
    border-color: #1f2937;
    box-shadow: 0 0 0 2px #4363d8;
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
