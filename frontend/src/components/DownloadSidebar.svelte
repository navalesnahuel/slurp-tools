<!-- src/lib/components/DownloadSidebar.svelte -->
<script>
	import { imageEditorStore } from '$lib/stores/imageEditorStore.js';
	import { getRenderImage } from '$lib/services/imageApi.js';
	import { browser } from '$app/environment';

	$: ({ imageUUID, imageUrl, isLoading, isApplying } = $imageEditorStore);
	$: canDownload = !!imageUUID && !!imageUrl && !isLoading && !isApplying;

	function handleDownloadOrOpen() {
		if (!canDownload || !browser) return;

		const urlToOpen = getRenderImage(imageUUID);
		const urlWithTimestamp = `${urlToOpen}${urlToOpen.includes('?') ? '&' : '?'}t=${Date.now()}`;

		try {
			const newTab = window.open(urlWithTimestamp, '_blank');
			if (newTab) {
				newTab.focus();
			} else {
				// Consider showing error via store?
				alert('Could not open image in new tab. Please check your popup blocker settings.');
			}
		} catch (error) {
			alert(`Error opening image: ${error.message}`);
		}
	}
</script>

<div class="sidebar-section download-section">
	<button on:click={handleDownloadOrOpen} class="button-like save-button" disabled={!canDownload}>
		Download Image
	</button>
</div>

<style>
	.sidebar-section.download-section {
		padding: 0;
		box-shadow: none;
		background: none;
		margin-top: -0.5rem; /* Adjust spacing if needed */
	}
	.save-button {
		background-color: var(--red);
		color: var(--crust);
		width: 100%;
	}
	.save-button:hover:not(:disabled) {
		background-color: color-mix(in srgb, var(--blue) 90%, white);
	}
	.save-button:disabled {
		background-color: var(--overlay0);
		color: var(--subtext0);
		border-color: var(--overlay0);
		opacity: 0.7;
	}
</style>
