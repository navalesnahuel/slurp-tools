<!-- src/lib/components/InitialUploadPrompt.svelte -->
<script>
	import { createEventDispatcher } from 'svelte';
	import ErrorMessageDisplay from './ErrorMessageDisplay.svelte';

	export let title = 'Image Tool';
	export let description = 'Select an image to begin.';
	export let errorMessage = '';

	const dispatch = createEventDispatcher();

	function handleOpenClick() {
		dispatch('open');
	}
</script>

<div class="initial-upload-state">
	<h1>{title}</h1>
	<p class="tool-description">{description}</p>
	<div class="input-area file-input-section">
		<button on:click={handleOpenClick} class="file-label button-like">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				width="24"
				height="24"
				fill="currentColor"
				style="margin-bottom: 0.5rem;"
			>
				<path
					d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"
				/>
			</svg>
			Open Image
		</button>
	</div>
	{#if errorMessage}
		<ErrorMessageDisplay {message} context="initial" />
	{/if}
</div>

<style>
	.initial-upload-state {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		text-align: center;
		background-color: var(--base);
		border-radius: 12px; /* Full radius when it's the only thing shown */
		height: 100%;
		min-height: 400px;
	}
	.initial-upload-state:only-child {
		border-radius: 12px;
	}
	h1 {
		font-family: var(--font-header);
		color: var(--text);
		font-weight: 600;
		font-size: 1.8rem;
		margin-bottom: 1rem;
	}
	.tool-description {
		margin-bottom: 1.5rem;
		color: var(--subtext0);
		max-width: 400px;
		line-height: 1.5;
	}
	.input-area {
		margin-bottom: 1rem;
	}

	/* Button Style */
	.file-label.button-like {
		display: inline-flex;
		flex-direction: column; /* Stack icon and text */
		align-items: center;
		justify-content: center;
		padding: 0.9rem 2rem; /* Slightly larger padding */
		border: 2px dashed var(--overlay); /* Dashed border */
		border-radius: 8px;
		font-family: var(--font-body);
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		text-align: center;
		transition:
			background-color 0.2s ease,
			color 0.2s ease,
			border-color 0.2s ease,
			transform 0.15s ease,
			box-shadow 0.2s ease;
		text-decoration: none;
		line-height: 1.2;
		gap: 0; /* Remove gap for stacked */
		user-select: none;
		background-color: var(--mantle); /* Darker background */
		color: var(--base); /* Lighter text */
		box-shadow: none;
		min-width: 220px;
		max-width: 280px;
	}
	.file-label.button-like:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		background-color: var(--crust);
		border-color: var(--blue);
		color: var(--blue);
	}
	.file-label.button-like:active:not(:disabled) {
		transform: translateY(0px);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		filter: brightness(0.95);
	}
	.file-label.button-like svg {
		width: 32px; /* Larger icon */
		height: 32px;
		margin-bottom: 0.6rem; /* Space between icon and text */
	}

	@media (max-width: 480px) {
		h1 {
			font-size: 1.5rem;
		}
		.tool-description {
			max-width: 90%;
			font-size: 0.9rem;
		}
		.file-label.button-like {
			min-width: 180px;
			padding: 0.8rem 1.5rem;
		}
	}
</style>
