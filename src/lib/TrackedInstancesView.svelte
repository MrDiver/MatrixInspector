<script>
  /**
   * TrackedInstancesView - Display matrix instances for dependency tracking
   * Shows A_0, A_1, A_2, etc. for formulas like A*A*A
   */
  import MatrixView from './MatrixView.svelte';
  import { parsedFormula, graph } from './stores';
  import { getAllMatrixReferences } from './formulaParser';

  let instances = [];

  // Generate list of instances from the formula
  $: if ($parsedFormula && $graph) {
    const refs = getAllMatrixReferences($parsedFormula);
    
    // Create instance info for each matrix reference
    instances = refs.map((ref, index) => {
      // Build the instance name based on whether it's transposed
      let instanceName = `${ref.name}_${index}`;
      if (ref.transpose) {
        instanceName = `${ref.name}_${index}_T`;
      }
      
      return {
        name: instanceName,
        displayName: `${ref.displayName} (${index})`,
        sourceName: ref.name,
        index,
        transpose: ref.transpose
      };
    }).filter(inst => {
      // Only show if the instance exists in the graph
      return $graph.matrices[inst.name];
    });
  }
</script>

<div class="tracked-instances">
  {#if instances.length > 0}
    <div class="section-header">
      <h3>Tracked Instances</h3>
      <p>Separate instances for dependency tracking in formulas</p>
    </div>
    
    <div class="matrix-row">
      {#each instances as instance (instance.name)}
        <div class="matrix-cell">
          <MatrixView
            matrixName={instance.name}
            label={instance.displayName}
            grayBackground={true}
            showMiniBlocks={true}
          />
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tracked-instances {
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
