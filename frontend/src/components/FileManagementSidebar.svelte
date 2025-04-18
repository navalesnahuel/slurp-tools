<script>
	import { imageEditorStore } from '$lib/stores/imageEditorStore.js';
	import { truncateFilename } from '$lib/utils/helpers.js';
	import { createEventDispatcher } from 'svelte';

	export let extraClass = ''; // Prop para clases adicionales desde el padre

	const dispatch = createEventDispatcher();
	$: ({ originalFilename, imageUUID, isLoading } = $imageEditorStore);

	function handleChangeClick() {
		if (isLoading) return;
		imageEditorStore.changeImage();
		dispatch('openFilePicker');
	}

	$: truncatedName = truncateFilename(originalFilename);
	$: imageIdShort = imageUUID ? `${imageUUID.substring(0, 8)}...` : '';
</script>

<div class="sidebar-section file-management {extraClass}">
	{#if originalFilename}
		<p class="filename" title={originalFilename}>{truncatedName}</p>
	{:else if imageUUID}
		<p class="filename">ID: {imageIdShort}</p>
	{:else}
		<p class="placeholder-text">No image selected.</p>
	{/if}
	<button on:click={handleChangeClick} class="button-like change-button" disabled={isLoading}>
		Change Image
	</button>
</div>

<style>
	.sidebar-section.file-management {
		padding: 1.2rem 1.5rem;
		border-radius: 10px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
		background-color: var(--mauve);
	}
	.filename {
		font-size: 0.85rem;
		margin-bottom: 1rem;
		background-color: var(--crust);
		color: var(--base);
		padding: 0.4rem 0.8rem;
		border-radius: 10px;
		overflow-wrap: break-word;
		word-break: break-all;
		border: 1px solid var(--mantle);
		line-height: 1.4;
	}
	.placeholder-text {
		font-size: 0.9rem;
		color: var(--subtext1);
		text-align: center;
		padding: 1rem 0;
		margin-bottom: 1rem;
	}
	.change-button {
		background-color: var(--crust);
		color: var(--mauve);
		border: 1px solid var(--mantle);
		padding: 0.6rem 1rem;
		font-size: 0.9rem;
		box-shadow: none;
		width: 100%;
	}
	.change-button:hover:not(:disabled) {
		background-color: var(--mantle);
		color: var(--lavender);
		border-color: var(--mantle);
		filter: brightness(1.1);
	}
	.change-button:disabled {
		opacity: 0.6;
		filter: grayscale(30%);
		background-color: var(--surface0);
		border-color: var(--overlay0);
		color: var(--subtext0);
	}
</style>
