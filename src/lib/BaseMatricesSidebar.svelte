<script>
  /**
   * BaseMatricesSidebar - Display and edit base matrices in a sidebar
   * Shows S, K, etc. with editing controls (random fill, diagonal fill, transpose)
   */
  import MatrixView from './MatrixView.svelte';
  import { parsedFormula, currentColor, transposeState } from './stores';
  import { getBaseMatrices } from './formulaParser';
  import { generateRandomMatrix, fillDiagonal } from './stores';

  let baseMatrices = [];
  let transpose = {};

  // Update base matrices when formula changes
  $: if ($parsedFormula) {
    baseMatrices = getBaseMatrices($parsedFormula);
    // Initialize transpose state for new matrices
    baseMatrices.forEach(name => {
      if (!(name in $transposeState)) {
        transposeState.update(state => ({ ...state, [name]: false }));
      }
    });
  }

  // Watch transpose state
  $: transpose = $transposeState;

  function toggleTranspose(matrix) {
    transposeState.update(state => ({ ...state, [matrix]: !state[matrix] }));
  }
</script>

<aside class="base-matrices-sidebar">
  <div class="sidebar-header">
    <h3>Matrices</h3>
  </div>

  <div class="matrices-container">
    {#if baseMatrices.length > 0}
      {#each baseMatrices as matrixName}
        <div class="matrix-item">
          <div class="matrix-display">
            <MatrixView
              matrixName={transpose[matrixName] ? `${matrixName}_T` : matrixName}
              label={matrixName}
              paintable={true}
              grayBackground={false}
            />
          </div>

          <div class="matrix-controls">
            <button
              class="control-btn"
              class:active={transpose[matrixName]}
              on:click={() => toggleTranspose(matrixName)}
              title="Transpose {matrixName}"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 17v-6a2 2 0 0 1 2-2h6"/>
                <polyline points="10 9 16 9 16 15"/>
              </svg>
            </button>

            <button
              class="control-btn"
              on:click={() => {
                let color;
                currentColor.subscribe(c => (color = c))();
                generateRandomMatrix(matrixName, 0.3, false, color);
              }}
              title="Random Fill {matrixName}"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M2 12h20"/>
              </svg>
            </button>

            <button
              class="control-btn"
              on:click={() => {
                let color;
                currentColor.subscribe(c => (color = c))();
                fillDiagonal(matrixName, color);
              }}
              title="Fill Diagonal {matrixName}"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="2" y1="2" x2="22" y2="22"/>
              </svg>
            </button>
          </div>
        </div>
      {/each}
    {:else}
      <div class="empty-state">
        <p>Enter a formula to see matrices</p>
      </div>
    {/if}
  </div>
</aside>

<style>
  .base-matrices-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    margin: 12px;
    margin-right: 0;
    background: var(--bg-primary);
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
    height: fit-content;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
    min-width: 240px;
    width: 240px;
  }

  .sidebar-header {
    position: sticky;
    top: 0;
    background: var(--bg-primary);
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    margin: -1rem -1rem 0 -1rem;
    padding: 1rem 1rem 0.75rem 1rem;
    border-radius: 16px 16px 0 0;
  }

  .sidebar-header h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-primary, #333);
  }

  .matrices-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .matrix-item {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .matrix-display {
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    border-radius: 8px;
    padding: 0.5rem;
    background: var(--bg-secondary);
  }

  .matrix-controls {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    border-radius: 6px;
    background-color: transparent;
    cursor: pointer;
    color: var(--text-secondary, #666);
    transition: all 0.2s ease;
  }

  .control-btn:hover {
    background-color: var(--hover-bg, #f0f0f0);
    color: var(--text-primary, #333);
    border-color: var(--border-color, rgba(0, 0, 0, 0.15));
  }

  .control-btn.active {
    background-color: var(--accent-color, #4CAF50);
    color: white;
    border-color: var(--accent-color, #4CAF50);
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    color: var(--text-secondary, #999);
    text-align: center;
    font-size: 0.9rem;
  }

  .empty-state p {
    margin: 0;
  }

  /* Dark mode support */
  :global(.dark-mode) .base-matrices-sidebar {
    background: var(--bg-primary-dark);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }

  :global(.dark-mode) .sidebar-header {
    background: var(--bg-primary-dark);
    border-bottom-color: var(--border-color-dark, rgba(255, 255, 255, 0.1));
  }

  :global(.dark-mode) .sidebar-header h3 {
    color: var(--text-primary-dark, #eee);
  }

  :global(.dark-mode) .matrix-display {
    border-color: var(--border-color-dark, rgba(255, 255, 255, 0.1));
    background: var(--bg-secondary-dark);
  }

  :global(.dark-mode) .control-btn {
    border-color: var(--border-color-dark, rgba(255, 255, 255, 0.1));
    background-color: transparent;
    color: var(--text-secondary-dark, #aaa);
  }

  :global(.dark-mode) .control-btn:hover {
    background-color: var(--hover-bg-dark, #333);
    color: var(--text-primary-dark, #eee);
    border-color: var(--border-color-dark, rgba(255, 255, 255, 0.15));
  }

  :global(.dark-mode) .empty-state {
    color: var(--text-secondary-dark, #999);
  }
</style>
