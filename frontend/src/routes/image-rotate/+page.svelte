<!-- src/routes/rotate/+page.svelte -->
<script>
	import { onDestroy } from 'svelte';
	import { imageEditorStore } from '$lib/stores/imageEditorStore.js';
	import ImageEditorLayout from '../../components/ImageEditorLayout.svelte';
	import FileManagementSidebar from '../../components/FileManagementSidebar.svelte';
	import HistoryControlsSidebar from '../../components/HistoryControlsSidebar.svelte';
	import DownloadSidebar from '../../components/DownloadSidebar.svelte';
	import { applyRotateFilter } from '$lib/services/imageApi.js';

	let rotationAngle = 0;

	let imageUUID, imageUrl, isLoading, isApplying, storeErrorMessage;
	const unsubscribeStore = imageEditorStore.subscribe((state) => {
		imageUUID = state.imageUUID;
		imageUrl = state.imageUrl;
		isLoading = state.isLoading;
		isApplying = state.isApplying;
		storeErrorMessage = state.errorMessage;
	});

	function handleImageLoad(event) {
		if (!event.target) return;
		const target = event.target;
		const dimensions = { width: target.naturalWidth, height: target.naturalHeight };

		imageEditorStore.imageLoadComplete(dimensions);
	}

	function handleImageError() {
		imageEditorStore.imageLoadError('Error: Failed to load image preview.');
	}

	function setRotation(angle) {
		if (isLoading || isApplying) return;
		rotationAngle = angle;
	}

	async function handleApplyRotate() {
		if (!imageUUID || isLoading || isApplying) {
			return;
		}
		const angleNum = Number(rotationAngle);
		if (isNaN(angleNum)) {
			return;
		}

		await imageEditorStore.applyFilter(
			(uuid) => applyRotateFilter(uuid, angleNum),
			`Rotate ${angleNum}°`
		);
	}

	$: canApplyRotate = !!imageUUID && !isLoading && !isApplying;

	$: displayError = storeErrorMessage;

	onDestroy(() => {
		unsubscribeStore();
		imageEditorStore.cleanupBlobUrl();
	});
</script>

<svelte:head>
	<title>Image Rotator - Slurp Tools</title>
</svelte:head>

<ImageEditorLayout toolTitle="Image Rotator" toolDescription="Select an image to rotate it.">
	<div slot="toolbar-left">
		<span class="toolbar-label">Rotator</span>
	</div>
	<div slot="toolbar-right">
		<button
			class="apply-button button-like toolbar-button"
			on:click={handleApplyRotate}
			disabled={!canApplyRotate}
			title={canApplyRotate ? `Apply ${rotationAngle}° rotation` : 'Load an image first'}
		>
			{#if isApplying}<span class="button-spinner"></span> Applying...{:else}Apply Rotate{/if}
		</button>
	</div>

	<div slot="main-content" class="rotate-main-content">
		{#if imageUrl}
			<div class="img-container">
				<img
					src={imageUrl}
					alt={$imageEditorStore.originalFilename || 'Image to rotate'}
					key={imageUrl}
					class="preview-image"
					on:load={handleImageLoad}
					on:error={handleImageError}
					style:opacity={isLoading ? 0.5 : 1}
				/>
			</div>
		{:else if !isLoading}
			<p class="placeholder-text">Select an image to start.</p>
		{/if}
	</div>

	<svelte:fragment slot="sidebar-content" let:openFilePicker>
		<FileManagementSidebar on:openFilePicker={openFilePicker} />

		<div class="sidebar-section section-rotate">
			<h4 class="h4-maroon">Rotation</h4>

			<div class="control-item rotation-slider-group">
				<label for="rotation-slider">Angle</label>
				<div class="slider-container">
					<input
						id="rotation-slider"
						type="range"
						min="-180"
						max="180"
						step="1"
						bind:value={rotationAngle}
						class="rotation-slider"
						disabled={isLoading || isApplying || !imageUUID}
					/>
					<span class="rotation-value">{rotationAngle}°</span>
				</div>
			</div>

			<div class="control-item quick-rotate-buttons">
				<button
					class="button-like quick-button"
					on:click={() => setRotation(-90)}
					disabled={isLoading || isApplying || !imageUUID}>-90°</button
				>
				<button
					class="button-like quick-button"
					on:click={() => setRotation(0)}
					disabled={isLoading || isApplying || !imageUUID}>0°</button
				>
				<button
					class="button-like quick-button"
					on:click={() => setRotation(90)}
					disabled={isLoading || isApplying || !imageUUID}>+90°</button
				>
				<button
					class="button-like quick-button"
					on:click={() => setRotation(180)}
					disabled={isLoading || isApplying || !imageUUID}>180°</button
				>
			</div>
		</div>

		<HistoryControlsSidebar />
		<DownloadSidebar />

		{#if displayError}
			<div class="sidebar-error-container">
				<p class="error-message sidebar-error">{displayError}</p>
			</div>
		{/if}
	</svelte:fragment>
</ImageEditorLayout>

<style>
	.toolbar-label {
		font-size: 1rem;
		font-weight: 600;
		color: var(--base);
		font-family: var(--font-header);
	}
	.apply-button.toolbar-button {
		background-color: var(--green);
		color: var(--crust);
		padding: 0.4rem 1.2rem;
		border-radius: 6px;
		border: none;
		font-weight: 500;
		font-size: 0.9rem;
		height: 32px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}
	div[slot='toolbar-right'] {
		height: 100%;
		display: flex;
		align-items: center;
	}
	.apply-button.toolbar-button:hover:not(:disabled) {
		filter: brightness(1.1);
	}
	.apply-button.toolbar-button:disabled {
		background-color: var(--overlay0) !important;
		color: var(--subtext0) !important;
		border: none;
		opacity: 0.6;
		filter: grayscale(30%);
	}
	.button-spinner {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border: 2px solid var(--crust);
		border-top: 2px solid transparent;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		vertical-align: middle;
		margin-right: 0.4rem;
	}
	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.rotate-main-content {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.img-container {
		max-width: 100%;
		max-height: 100%;
		line-height: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
	}
	.preview-image {
		display: block;
		max-width: 100%;
		max-height: 100%;
		opacity: 1;
		image-orientation: none;
		object-fit: contain;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		background-color: var(--base);
		transition: opacity 0.2s ease-in-out;
	}
	.placeholder-text {
		font-size: 0.9rem;
		color: var(--subtext0);
		text-align: center;
		padding: 1rem 0;
	}

	.sidebar-section {
		padding: 1.2rem 1.5rem;
		border-radius: 10px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
	}
	.sidebar-section h4 {
		font-family: var(--font-header);
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		padding-bottom: 0.6rem;
		color: inherit;
		border-bottom: 1px solid color-mix(in srgb, currentColor 25%, transparent);
	}

	.section-rotate {
		background-color: var(--maroon);
		color: var(--text);
	}
	.section-rotate h4 {
		color: var(--text);
		border-bottom-color: color-mix(in srgb, var(--text) 30%, transparent);
	}

	.control-item {
		margin-bottom: 1.2rem;
	}
	.control-item:last-child {
		margin-bottom: 0;
	}
	.rotation-slider-group label {
		color: var(--text);
		font-weight: 500;
		display: block;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}
	.rotation-slider-group .slider-container {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.rotation-slider {
		flex-grow: 1;
		height: 8px;
		cursor: pointer;
		accent-color: var(--peach);
		background: var(--overlay);
		border-radius: 4px;
		margin: 0;
		min-width: 80px;
		transition: box-shadow 0.2s ease;
	}
	.rotation-slider:hover:not(:disabled) {
		box-shadow: 0 0 5px color-mix(in srgb, var(--peach) 50%, transparent);
	}
	.rotation-slider:disabled {
		cursor: not-allowed;
		opacity: 0.5;
		box-shadow: none;
		accent-color: var(--overlay);
		background: var(--overlay0);
	}
	.rotation-value {
		color: var(--base);
		font-weight: 500;
		font-size: 0.9rem;
		min-width: 45px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.quick-rotate-buttons {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.quick-button {
		width: 100%;
		padding: 0.4rem 0.5rem;
		font-size: 0.8rem;
		background-color: var(--crust);
		color: var(--flamingo);
		border: 1px solid var(--mantle);
		box-shadow: none;
	}
	.quick-button:hover:not(:disabled) {
		background-color: var(--mantle);
		filter: brightness(1.15);
	}
	.quick-button:disabled {
		opacity: 0.5;
		filter: grayscale(80%);
		cursor: not-allowed;
		background-color: var(--surface0) !important;
		color: var(--overlay) !important;
		border-color: var(--surface1) !important;
	}

	.sidebar-error-container {
		margin-top: 0;
	}
	.error-message.sidebar-error {
		margin: 0;
		width: 100%;
		box-sizing: border-box;
		text-align: left;
		background-color: color-mix(in srgb, var(--red) 20%, transparent);
		color: var(--text);
		border: 1px solid var(--red);
		border-radius: 6px;
		padding: 0.6rem 1rem;
		font-size: 0.85rem;
	}
</style>
