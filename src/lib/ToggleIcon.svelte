<script>
  export let type = 'identity'; // 'identity', 'symmetric', 'sympattern'
</script>

{#if type === 'identity'}
  <!-- Identity element icon: bold "1" -->
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <text x="12" y="17" text-anchor="middle" font-size="20" font-weight="900" font-family="monospace" letter-spacing="-1">1</text>
  </svg>
{:else if type === 'symmetric'}
  <!-- Symmetric icon: diagonal dashed line with colored blobs -->
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <!-- Diagonal dashed line from top-left to bottom-right -->
    <line x1="4" y1="4" x2="20" y2="20" stroke-dasharray="3,2" stroke="currentColor" />
    <!-- Top-right blob in cyan accent -->
    <circle cx="17" cy="7" r="3" fill="var(--color-cyan)" />
    <!-- Bottom-left blob in cyan accent -->
    <circle cx="7" cy="17" r="3" fill="var(--color-cyan)" />
  </svg>
{:else if type === 'sympattern'}
  <!-- Symmetric pattern icon: four corners with center axis -->
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
    <!-- Vertical and horizontal center lines -->
    <line x1="12" y1="2" x2="12" y2="22" stroke-dasharray="2,2" opacity="0.5" />
    <line x1="2" y1="12" x2="22" y2="12" stroke-dasharray="2,2" opacity="0.5" />
    <!-- Dots at corners -->
    <circle cx="6" cy="6" r="2" fill="currentColor" />
    <circle cx="18" cy="6" r="2" fill="currentColor" />
    <circle cx="6" cy="18" r="2" fill="currentColor" />
    <circle cx="18" cy="18" r="2" fill="currentColor" />
  </svg>
{/if}

<style>
  :global(.toggle-button svg) {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
