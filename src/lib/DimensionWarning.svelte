<script>
	import { dimensionMismatches } from './stores.js';
</script>

{#if $dimensionMismatches && $dimensionMismatches.length > 0}
	<div class="dimension-warning">
		<div class="warning-header">
			<svg class="warning-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
					fill="currentColor"
				/>
			</svg>
			<span class="warning-title">Dimension Mismatch</span>
		</div>
		<div class="warning-messages">
			{#each $dimensionMismatches as error}
				<p class="error-message">{error}</p>
			{/each}
		</div>
	</div>
{/if}

<style>
	.dimension-warning {
		background-color: #fff3cd;
		border: 1px solid #ffc107;
		border-radius: 4px;
		padding: 12px 16px;
		margin-bottom: 12px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.warning-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.warning-icon {
		width: 20px;
		height: 20px;
		color: #ff9800;
		flex-shrink: 0;
	}

	.warning-title {
		font-weight: 600;
		color: #ff9800;
		font-size: 14px;
	}

	.warning-messages {
		margin: 0;
		padding-left: 28px;
	}

	.error-message {
		margin: 4px 0;
		color: #333;
		font-size: 13px;
		font-family: 'Courier New', monospace;
		line-height: 1.4;
	}

	.error-message:first-child {
		margin-top: 0;
	}

	.error-message:last-child {
		margin-bottom: 0;
	}
</style>
