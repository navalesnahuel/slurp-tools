<!-- src/lib/components/PdfPreviewItem.svelte -->
<script>
	import { createEventDispatcher } from 'svelte';

	export let preview;

	export let isFirst = false;

	export let isLast = false;

	export let disabled = false;

	const dispatch = createEventDispatcher();

	function move(direction) {
		dispatch('move', { id: preview.id, direction });
	}

	function remove() {
		dispatch('remove', { id: preview.id });
	}

	$: truncatedName =
		preview.file.name.length > 20
			? preview.file.name.substring(0, 18) + '...'
			: preview.file.name;
</script>

<div class="preview-item" class:disabled>
	<img
		src={preview.previewUrl}
		alt={preview.file.name}
		title={preview.file.name}
		class="preview-thumbnail"
	/>
	<p class="preview-filename" title={preview.file.name}>{truncatedName}</p>
	<div class="preview-controls">
		<button
			class="control-button move-button"
			title="Move Up"
			on:click={() => move('up')}
			disabled={isFirst || disabled}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				fill="currentColor"
				viewBox="0 0 16 16"
				><path
					fill-rule="evenodd"
					d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5"
				/></svg
			>
		</button>
		<button
			class="control-button move-button"
			title="Move Down"
			on:click={() => move('down')}
			disabled={isLast || disabled}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				fill="currentColor"
				viewBox="0 0 16 16"
				><path
					fill-rule="evenodd"
					d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1"
				/></svg
			>
		</button>
		<button
			class="control-button remove-button"
			title="Remove Image"
			on:click={remove}
			{disabled}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				fill="currentColor"
				viewBox="0 0 16 16"
				><path
					d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"
				/><path
					d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"
				/></svg
			>
		</button>
	</div>
</div>

<style>
	.preview-item {
		background-color: var(--mantle);
		border-radius: 8px;
		padding: 0.7rem;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		position: relative;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease,
			opacity 0.2s ease;
		border: 1px solid var(--base);
	}
	.preview-item:hover {
		transform: translateY(-3px);
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.15);
		border-color: var(--base);
	}
	.preview-item.disabled {
		opacity: 0.6;
		pointer-events: none;
	}
	.preview-thumbnail {
		width: 100%;
		height: 100px;
		object-fit: cover;
		border-radius: 4px;
		margin-bottom: 0.5rem;
		background-color: var(--base);
		border: 1px solid var(--overlay);
	}
	.preview-filename {
		font-size: 0.75rem;
		color: var(--base);
		margin-bottom: 0.5rem;
		word-break: break-all;
		line-height: 1.3;
		height: 2.6em;
		overflow: hidden;
		width: 100%;
	}
	.preview-controls {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
		width: 100%;
		margin-top: auto;
		padding-top: 0.4rem;
	}
	.control-button {
		background: var(--surface1);
		border: none;
		color: var(--base);
		border-radius: 5px;
		padding: 0.3rem 0.4rem;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			color 0.2s ease;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}
	.control-button svg {
		width: 1em;
		height: 1em;
	}
	.control-button:hover:not(:disabled) {
		background-color: var(--base);
	}
	.control-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		background-color: var(--surface0);
		color: var(--overlay);
	}
	.remove-button:hover:not(:disabled) {
		background-color: var(--red);
		color: var(--base);
	}
	.move-button:hover:not(:disabled) {
		background-color: var(--blue);
		color: var(--base);
	}
</style>
