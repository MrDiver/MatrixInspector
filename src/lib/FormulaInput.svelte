<script>
  import { parseFormula, getDisplayName, getBaseMatrices } from './formulaParser';
  import { currentFormula, parsedFormula } from './stores';
  
  export let collapsed = false;
  
  let formula = '';
  let parsed = { variables: new Set(), tokens: [], error: null };
  
  // Subscribe to store on mount
  currentFormula.subscribe(value => {
    if (value && value !== formula) {
      formula = value;
    }
  });
  
  $: {
    parsed = parseFormula(formula);
    currentFormula.set(formula);
    parsedFormula.set(parsed.error ? null : parsed);
  }
  
  $: baseMatrices = getBaseMatrices(parsed);
  $: hasError = parsed.error !== null;
  $: showPreview = formula.trim().length > 0;
</script>

<div class="formula-input-container" class:collapsed>
  <div class="input-wrapper">
    <label for="formula">Matrix Formula:</label>
    <input
      id="formula"
      type="text"
      bind:value={formula}
      placeholder="Try: S*K*S or A*A^T or P_0^T*K_0*P_0"
      class:error={hasError}
    />
    <div class="examples">
      <span class="examples-label">Examples:</span>
      <button class="example-btn" on:click={() => formula = 'S*K*S'}>S×K×S</button>
      <button class="example-btn" on:click={() => formula = 'A*A^T'}>A×A^T</button>
      <button class="example-btn" on:click={() => formula = 'P_0^T*K_0*P_0'}>P₀^T×K₀×P₀</button>
    </div>
    {#if hasError}
      <div class="error-message">{parsed.error}</div>
    {/if}
  </div>
  
  {#if showPreview && !hasError}
    <div class="preview">
      <div class="preview-label">Detected matrices:</div>
      <div class="matrix-list">
        {#each baseMatrices as matrixName}
          <span class="matrix-badge">{matrixName}</span>
        {/each}
      </div>
      
      {#if parsed.tokens && parsed.tokens.length > 0}
        <div class="formula-display">
          <div class="preview-label">Formula:</div>
          <div class="formula-tokens">
            {#each parsed.tokens as token, i}
              <span class="token" class:transpose={token.transpose}>
                {getDisplayName(token)}
              </span>
              {#if i < parsed.tokens.length - 1}
                <span class="operator">×</span>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .formula-input-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    background: var(--bg-secondary);
    border-radius: 12px;
    margin-bottom: 24px;
    transition: all 0.3s ease;
  }
  
  .formula-input-container.collapsed {
    max-height: 60px;
    overflow: hidden;
  }
  
  .input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  label {
    font-weight: 600;
    font-size: 14px;
    color: var(--text-primary);
  }
  
  input {
    padding: 12px 16px;
    font-size: 16px;
    font-family: 'Courier New', monospace;
    border: 2px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-primary);
    color: var(--text-primary);
    transition: border-color 0.2s ease;
  }
  
  input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--input-focus-shadow);
  }
  
  input.error {
    border-color: var(--danger-red);
  }
  
  .examples {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }
  
  .examples-label {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 600;
  }
  
  .example-btn {
    padding: 4px 10px;
    font-size: 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Courier New', monospace;
  }
  
  .example-btn:hover {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
  
  .error-message {
    color: var(--danger-red);
    font-size: 13px;
    margin-top: 4px;
  }
  
  .preview {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--bg-primary);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }
  
  .preview-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .matrix-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .matrix-badge {
    padding: 6px 12px;
    background: var(--color-primary);
    color: white;
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: 600;
  }
  
  .formula-display {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .formula-tokens {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-family: 'Courier New', monospace;
    font-size: 18px;
  }
  
  .token {
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border-radius: 6px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .token.transpose {
    background: var(--color-cyan);
    color: var(--bg-primary);
  }
  
  .operator {
    color: var(--text-secondary);
    font-size: 20px;
    font-weight: bold;
  }
</style>
