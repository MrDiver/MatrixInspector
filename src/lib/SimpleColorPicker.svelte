<script>
  import { PRESET_COLORS } from './constants';
  
  export let color = PRESET_COLORS[0];
</script>

<div class="color-picker">
  {#each PRESET_COLORS as presetColor}
    <button
      class="color-swatch"
      class:active={color === presetColor}
      style:background-color={presetColor}
      on:click={() => color = presetColor}
      title={presetColor}
    ></button>
  {/each}
</div>

<style>
  .color-picker {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .color-swatch {
    width: 32px;
    height: 32px;
    border: 2px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
  }
  
  .color-swatch:hover {
    transform: scale(1.15);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
  
  .color-swatch.active {
    border-color: #333;
    border-width: 3px;
    transform: scale(1.2);
  }
</style>
