<!-- src/lib/components/LoadingIndicator.svelte -->
<script>
	import ErrorMessageDisplay from './ErrorMessageDisplay.svelte';

	export let message = 'Loading...';
	export let errorMessage = '';
</script>

<div class="loading-state">
	<div class="spinner"></div>
	<p>{message}</p>
	{#if errorMessage}
		<ErrorMessageDisplay {message} context="loading" />
	{/if}
</div>

<style>
	.loading-state {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		text-align: center;
		background-color: var(--base);
		border-radius: 12px 12px 0 0; /* Only top rounding when part of layout */
		height: 100%;
		min-height: 400px;
	}
	.loading-state:only-child {
		border-radius: 12px; /* Full radius when shown alone */
	}
	.spinner {
		border: 4px solid var(--surface1);
		border-top: 4px solid var(--blue);
		border-radius: 50%;
		width: 40px;
		height: 40px;
		animation: spin 1s linear infinite;
	}
	p {
		margin-top: 1rem;
		color: var(--text);
		font-weight: 500;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
