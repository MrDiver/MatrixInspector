<script>
  import MatrixView from './MatrixView.svelte';
  import { graph } from './stores';

  let intermediateMatrices = [];

  // Get intermediate matrices from the graph whenever it updates
  $: if ($graph && $graph.intermediateDescriptions) {
    intermediateMatrices = Object.entries($graph.intermediateDescriptions)
      .filter(([matrixName]) => $graph.matrices[matrixName])
      .map(([matrixName, description]) => ({
        name: matrixName,
        description
      }));
  }
</script>

<div class="intermediate-matrices">
  {#if intermediateMatrices.length > 0}
    <div class="section-header">
      <h3>Intermediate Results</h3>
      <p>Results of intermediate computations</p>
    </div>
    
    <div class="matrix-row">
      {#each intermediateMatrices as intermediate (intermediate.name)}
        <div class="matrix-cell">
          <MatrixView
            matrixName={intermediate.name}
            label={intermediate.description}
            grayBackground={true}
            showMiniBlocks={true}
          />
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .intermediate-matrices {
    padding: 24px 16px;
    border-bottom: 1px solid var(--border-color);
  }

  .section-header {
    margin-bottom: 16px;
  }

  .section-header h3 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .section-header p {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .matrix-row {
    display: flex;
    gap: 16px;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .matrix-cell {
    display: flex;
    flex-direction: column;
  }
</style>
