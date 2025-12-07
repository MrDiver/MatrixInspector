<script>
  import { getSavedConfigurations, loadConfigurationFromStorage, deleteConfiguration, saveConfigurationToStorage, exportMatrices, importMatrices } from './stores';
  import { onMount, createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let savedConfigs = [];
  let showSaveDialog = false;
  let saveName = '';
  let showGallery = false;
  let galleryContainer;

  onMount(() => {
    refreshGallery();
    
    // Add document click listener for closing gallery
    const handleDocumentClick = (e) => {
      if (showGallery && galleryContainer && !galleryContainer.contains(e.target)) {
        showGallery = false;
      }
    };
    
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  });

  function refreshGallery() {
    savedConfigs = getSavedConfigurations();
  }

  function handleSaveClick() {
    showSaveDialog = true;
    saveName = `Config ${new Date().toLocaleTimeString()}`;
  }

  function handleSave() {
    if (!saveName.trim()) {
      alert('Please enter a configuration name');
      return;
    }
    const result = saveConfigurationToStorage(saveName);
    if (result?.success) {
      refreshGallery();
      showSaveDialog = false;
      saveName = '';
      dispatch('notify', { message: `Saved "${saveName}"`, type: 'success' });
    } else {
      dispatch('notify', { message: result?.error || 'Failed to save configuration', type: 'error' });
    }
  }

  function handleLoad(name) {
    const result = loadConfigurationFromStorage(name);
    if (result?.success) {
      dispatch('notify', { message: `Loaded "${name}"`, type: 'success' });
      showGallery = false;
    } else {
      dispatch('notify', { message: result?.error || 'Failed to load configuration', type: 'error' });
    }
  }

  function handleDelete(name) {
    if (confirm(`Delete configuration "${name}"?`)) {
      const result = deleteConfiguration(name);
      if (result?.success) {
        refreshGallery();
        dispatch('notify', { message: `Deleted "${name}"`, type: 'success' });
      } else {
        dispatch('notify', { message: result?.error || 'Failed to delete configuration', type: 'error' });
      }
    }
  }

  function handleExport() {
    const data = exportMatrices();
    const json = JSON.stringify(data, null, 2);
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `matrix-config-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    dispatch('notify', { message: 'Exported configuration', type: 'success' });
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      // @ts-ignore
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const fileText = event.target?.result;
          if (typeof fileText !== 'string') return;
          
          const data = JSON.parse(fileText);
          const importResult = importMatrices(data);
          if (importResult?.success) {
            dispatch('notify', { message: 'Configuration imported successfully', type: 'success' });
          } else {
            dispatch('notify', { message: importResult?.error || 'Failed to import configuration', type: 'error' });
          }
        } catch (error) {
          dispatch('notify', { message: 'Invalid JSON file', type: 'error' });
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }
</script>

<div class="gallery-container" bind:this={galleryContainer}>
  <button on:click={() => showGallery = !showGallery} class="gallery-toggle" title="Toggle Gallery">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  </button>

  {#if showGallery}
    <div class="gallery-panel">
      <div class="gallery-header">
        <h3>Saved Configurations</h3>
        <div class="gallery-actions">
          <button on:click={handleSaveClick} class="btn-small" title="Save current">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
          </button>
          <button on:click={handleExport} class="btn-small" title="Export as JSON">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button on:click={handleImport} class="btn-small" title="Import from JSON">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
      </div>

      {#if showSaveDialog}
        <div class="save-dialog">
          <input 
            type="text" 
            bind:value={saveName} 
            placeholder="Configuration name"
            on:keydown={(e) => e.key === 'Enter' && handleSave()}
          />
          <div class="dialog-buttons">
            <button on:click={handleSave} class="btn-confirm">Save</button>
            <button on:click={() => showSaveDialog = false} class="btn-cancel">Cancel</button>
          </div>
        </div>
      {/if}

      <div class="gallery-list">
        {#if savedConfigs.length === 0}
          <p class="empty-message">No saved configurations yet</p>
        {:else}
          {#each savedConfigs as config (config.name)}
            <div class="gallery-item">
              <div class="item-info">
                <span class="item-name">{config.name}</span>
                <span class="item-details">{config.dimensions.rows}×{config.dimensions.cols}</span>
              </div>
              <div class="item-actions">
                <button on:click={() => handleLoad(config.name)} class="btn-load" title="Load">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12c0-2.209 1.791-4 4-4h6c2.209 0 4 1.791 4 4s-1.791 4-4 4h-6c-2.209 0-4-1.791-4-4z"/>
                  </svg>
                </button>
                <button on:click={() => handleDelete(config.name)} class="btn-delete" title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .gallery-container {
    position: fixed;
    bottom: 24px;
    left: 24px;
    z-index: 100;
  }

  .gallery-toggle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--header-gradient);
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    transition: transform 0.2s, box-shadow 0.2s;
    touch-action: manipulation;
  }

  .gallery-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
  }

  .gallery-toggle:active {
    transform: scale(0.95);
  }

  .gallery-panel {
    position: absolute;
    bottom: 64px;
    left: 0;
    width: 280px;
    background: var(--bg-primary);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    max-height: 400px;
    animation: slideUp 0.2s ease-out;
    border: 1px solid var(--border-color);
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .gallery-header {
    padding: 16px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .gallery-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .gallery-actions {
    display: flex;
    gap: 4px;
  }

  .btn-small {
    padding: 6px;
    background: var(--bg-tertiary);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  .btn-small:hover {
    background: var(--border-color);
    color: var(--text-primary);
  }

  .btn-small:active {
    transform: scale(0.95);
  }

  .save-dialog {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .save-dialog input {
    padding: 8px 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-radius: 6px;
    font-size: 13px;
    transition: border-color 0.15s;
  }

  .save-dialog input:focus {
    outline: none;
    border-color: var(--primary-blue);
    box-shadow: 0 0 0 3px var(--input-focus-shadow);
  }

  .dialog-buttons {
    display: flex;
    gap: 6px;
  }

  .btn-confirm,
  .btn-cancel {
    flex: 1;
    padding: 6px;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    touch-action: manipulation;
  }

  .btn-confirm {
    background: var(--primary-blue);
    color: white;
  }

  .btn-confirm:hover {
    background: var(--primary-blue-hover);
  }

  .btn-confirm:active {
    transform: scale(0.95);
  }

  .btn-cancel {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .btn-cancel:hover {
    background: var(--border-color);
    color: var(--text-primary);
  }

  .btn-cancel:active {
    transform: scale(0.95);
  }

  .gallery-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .empty-message {
    text-align: center;
    padding: 24px 16px;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .gallery-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-radius: 6px;
    background: var(--bg-tertiary);
    margin-bottom: 6px;
    transition: all 0.2s;
    border: 1px solid var(--border-color);
  }

  .gallery-item:hover {
    background: var(--border-color);
  }

  .item-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .item-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-details {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .item-actions {
    display: flex;
    gap: 6px;
    margin-left: 8px;
  }

  .btn-load,
  .btn-delete {
    padding: 4px 6px;
    border: none;
    border-radius: 4px;
    background: var(--bg-secondary);
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  .btn-load:hover {
    background: var(--primary-blue);
    color: white;
  }

  .btn-load:active {
    transform: scale(0.9);
  }

  .btn-delete:hover {
    background: var(--danger-red);
    color: white;
  }

  .btn-delete:active {
    transform: scale(0.9);
  }

  .gallery-list::-webkit-scrollbar {
    width: 4px;
  }

  .gallery-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .gallery-list::-webkit-scrollbar-thumb {
    background: var(--text-secondary);
    border-radius: 2px;
  }

  .gallery-list::-webkit-scrollbar-thumb:hover {
    background: var(--text-primary);
  }
</style>
