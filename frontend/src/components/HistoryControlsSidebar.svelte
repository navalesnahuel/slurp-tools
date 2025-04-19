<script>
	import { onDestroy } from 'svelte';
	import { imageEditorStore } from '$lib/stores/imageEditorStore.js';

	export let extraClass = '';

	let imageUUID, isLoading, isApplying;
	const unsubscribe = imageEditorStore.subscribe((state) => {
		imageUUID = state.imageUUID;
		isLoading = state.isLoading;
		isApplying = state.isApplying;
	});
	onDestroy(unsubscribe);

	$: canUndo = !!imageUUID && !isLoading && !isApplying;
	$: canRedo = !!imageUUID && !isLoading && !isApplying;
</script>

<div class="sidebar-section history-controls-section {extraClass}">
	<div class="control-item history-controls">
		<button
			class="button-like history-button"
			on:click={() => imageEditorStore.undo()}
			disabled={!canUndo}
			title={canUndo ? 'Undo' : 'Nothing to undo'}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				fill="currentColor"
				viewBox="0 0 16 16"
				><path
					fill-rule="evenodd"
					d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"
				/><path
					d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"
				/></svg
			>
			<span>Undo</span>
		</button>
		<button
			class="button-like history-button"
			on:click={() => imageEditorStore.redo()}
			disabled={!canRedo}
			title={canRedo ? 'Redo' : 'Nothing to redo'}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				fill="currentColor"
				viewBox="0 0 16 16"
				><path
					fill-rule="evenodd"
					d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
				/><path
					d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36-1.966a.25.25 0 0 1 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"
				/></svg
			>
			<span>Redo</span>
		</button>
	</div>
</div>

<style>
	.sidebar-section.history-controls-section {
		background-color: var(--teal);
		color: var(--base);
		padding: 1.2rem 1.5rem;
		border-radius: 10px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
	}
	.control-item.history-controls {
		display: flex;
		gap: 0.8rem;
		justify-content: space-between;
		margin-top: 0;
	}
	.history-button {
		flex: 1;
		padding: 0.5rem 0.8rem;
		font-size: 0.85rem;
		background-color: var(--crust);
		color: var(--sky);
		border: 1px solid var(--mantle);
		box-shadow: none;
		gap: 0.4rem;
		width: auto;
		justify-content: center;
	}
	.history-button svg {
		width: 1em;
		height: 1em;
		flex-shrink: 0;
	}
	.history-button:hover:not(:disabled) {
		background-color: var(--mantle);
		filter: brightness(1.15);
	}
	.history-button:disabled {
		opacity: 0.5;
		filter: grayscale(80%);
		cursor: not-allowed;
		background-color: var(--surface0) !important;
		color: var(--overlay) !important;
		border-color: var(--surface1) !important;
	}
	@media (max-width: 900px) {
		.history-button span {
			display: none;
		}
		.history-button {
			flex: none;
			padding: 0.5rem;
		}
		.control-item.history-controls {
			justify-content: space-around;
		}
	}
</style>
