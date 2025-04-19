<!-- src/routes/crop/+page.svelte -->
<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { imageEditorStore } from '$lib/stores/imageEditorStore.js';
	import ImageEditorLayout from '../../components/ImageEditorLayout.svelte';
	import FileManagementSidebar from '../../components/FileManagementSidebar.svelte';
	import HistoryControlsSidebar from '../../components/HistoryControlsSidebar.svelte';
	import DownloadSidebar from '../../components/DownloadSidebar.svelte';
	import { loadCropperAssetsIfNeeded, destroyCropperInstance } from '$lib/utils/cropperUtils.js';
	import { applyCropFilter } from '$lib/services/imageApi.js';

	let imageElement = null;
	let cropperInstance = null;
	let zoom = 100;
	let initialZoomRatio = 1;
	let isUpdatingFromSlider = false;
	let aspect = NaN;
	let aspectRatioLabel = 'Free';
	let croppedAreaPixels = null;

	let imageUUID, imageUrl, isLoading, isApplying, errorMessage;
	const unsubscribeStore = imageEditorStore.subscribe((state) => {
		let shouldReinitCropper = false;
		if (imageUrl !== state.imageUrl && state.imageUrl) {
			cropperInstance = destroyCropperInstance(cropperInstance);
			croppedAreaPixels = null;
			imageUrl = state.imageUrl;
		} else if (!state.imageUrl && cropperInstance) {
			cropperInstance = destroyCropperInstance(cropperInstance);
			croppedAreaPixels = null;
			imageUrl = state.imageUrl;
		}

		if (imageUUID !== state.imageUUID) imageUUID = state.imageUUID;
		if (isLoading !== state.isLoading) isLoading = state.isLoading;
		if (isApplying !== state.isApplying) isApplying = state.isApplying;
		if (errorMessage !== state.errorMessage) errorMessage = state.errorMessage;
	});

	async function handleImageLoad(event) {
		if (!event.target) return;
		const target = event.target;
		const dimensions = { width: target.naturalWidth, height: target.naturalHeight };

		imageEditorStore.imageLoadComplete(dimensions);

		cropperInstance = destroyCropperInstance(cropperInstance);
		croppedAreaPixels = null;

		try {
			await loadCropperAssetsIfNeeded();
			await tick();
			initializeCropper();
		} catch (err) {
			imageEditorStore.imageLoadError(`Failed to load cropping library: ${err.message}`);
		}
	}

	function handleImageError() {
		imageEditorStore.imageLoadError('Error: Failed to load image preview.');
		cropperInstance = destroyCropperInstance(cropperInstance);
	}

	async function initializeCropper() {
		if (
			!imageElement ||
			!imageUrl ||
			!imageUUID ||
			cropperInstance ||
			typeof Cropper === 'undefined' ||
			isLoading ||
			isApplying
		) {
			return;
		}

		if (
			imageElement &&
			typeof Cropper !== 'undefined' &&
			!cropperInstance &&
			!isLoading &&
			!isApplying
		) {
			try {
				cropperInstance = new Cropper(imageElement, {
					aspectRatio: aspect,
					viewMode: 1,
					dragMode: 'move',
					autoCropArea: 0.8,
					movable: true,
					rotatable: false,
					scalable: false,
					zoomable: true,
					zoomOnWheel: true,
					wheelZoomRatio: 0.1,
					cropBoxMovable: true,
					cropBoxResizable: true,
					background: false,
					guides: true,
					center: true,
					highlight: true,
					responsive: true,
					checkOrientation: false,
					modal: false,
					crop: updateCropDataFromEvent,
					zoom: updateSliderFromCropper,
					ready: () => {
						const canvasData = cropperInstance.getCanvasData();
						const imgData = cropperInstance.getImageData();
						initialZoomRatio =
							imgData.naturalWidth > 0 ? canvasData.width / imgData.naturalWidth : 1;
						zoom = 100;
						updateCropData();
					}
				});
				if (!isNaN(aspect)) {
					cropperInstance.setAspectRatio(aspect);
				}
			} catch (err) {
				imageEditorStore.imageLoadError(`Failed to initialize cropper: ${err.message}`);
				cropperInstance = destroyCropperInstance(cropperInstance);
			}
		} else {
		}
	}

	function updateCropDataFromEvent(event) {
		if (cropperInstance && !isApplying) {
			updateCroppedAreaPixels(cropperInstance.getData(true));
		}
	}
	function updateCropData() {
		if (cropperInstance && !isApplying) {
			updateCroppedAreaPixels(cropperInstance.getData(true));
		} else {
			croppedAreaPixels = null;
		}
	}
	function updateCroppedAreaPixels(data) {
		if (data && data.width > 0 && data.height > 0) {
			croppedAreaPixels = {
				x: Math.round(data.x),
				y: Math.round(data.y),
				width: Math.round(data.width),
				height: Math.round(data.height)
			};
		} else if (!data || data.width <= 0 || data.height <= 0) {
			croppedAreaPixels = null;
		}
	}

	function updateAspectRatio(newAspect, label) {
		if (isLoading || isApplying) return;
		aspect = newAspect;
		aspectRatioLabel = label;
		if (cropperInstance) {
			cropperInstance.setAspectRatio(newAspect);
		}
	}

	function updateZoomFromSlider(event) {
		if (!cropperInstance || initialZoomRatio <= 0 || isLoading || isApplying) return;
		const imgData = cropperInstance.getImageData();
		if (!imgData || imgData.naturalWidth === 0) return;
		const sliderValue = parseFloat(event.target.value);
		const targetAbsoluteRatio = initialZoomRatio * (sliderValue / 100);
		if (targetAbsoluteRatio <= 0) return;
		isUpdatingFromSlider = true;
		try {
			cropperInstance.zoomTo(targetAbsoluteRatio);
		} catch (e) {
		} finally {
			tick().then(() => {
				isUpdatingFromSlider = false;
			});
		}
	}

	function updateSliderFromCropper(event) {
		if (
			!cropperInstance ||
			initialZoomRatio <= 0 ||
			isUpdatingFromSlider ||
			isLoading ||
			isApplying
		) {
			if (isUpdatingFromSlider) isUpdatingFromSlider = false;
			return;
		}
		const imgData = cropperInstance.getImageData();
		if (!imgData || imgData.naturalWidth === 0) return;
		const currentAbsoluteRatio = event.detail.ratio;
		const newSliderValue = Math.round((currentAbsoluteRatio / initialZoomRatio) * 100);
		const minZoom = 1;
		const maxZoom = 500;
		const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newSliderValue));
		if (zoom !== clampedZoom) {
			zoom = clampedZoom;
		}
	}

	async function handleApplyCrop() {
		if (!cropperInstance || !imageUUID || isApplying || isLoading) return;
		const cropData = cropperInstance.getData(true);
		if (!cropData || cropData.width <= 0 || cropData.height <= 0) {
			return;
		}

		await imageEditorStore.applyFilter(
			(uuid) =>
				applyCropFilter(uuid, {
					x: cropData.x,
					y: cropData.y,
					width: cropData.width,
					height: cropData.height
				}),
			'Crop'
		);
	}

	onMount(async () => {
		try {
			await loadCropperAssetsIfNeeded();
		} catch (err) {}
	});

	onDestroy(() => {
		unsubscribeStore();
		cropperInstance = destroyCropperInstance(cropperInstance);
		imageEditorStore.cleanupBlobUrl();
	});

	$: canControlCropper = !!cropperInstance && !isLoading && !isApplying;
	$: canApply =
		canControlCropper &&
		!!croppedAreaPixels &&
		croppedAreaPixels.width > 0 &&
		croppedAreaPixels.height > 0;
</script>

<svelte:head>
	<title>Crop Image - Slurp Tools</title>
</svelte:head>

<ImageEditorLayout
	toolTitle="Image Cropper"
	toolDescription="Select an image, adjust the selection, and apply the crop."
>
	<div slot="toolbar-left">
		<span class="toolbar-label">Aspect Ratio:</span>
		<div class="aspect-ratio-controls">
			<button
				class:active={aspectRatioLabel === 'Free'}
				on:click={() => updateAspectRatio(NaN, 'Free')}
				disabled={!canControlCropper}>Free</button
			>
			<button
				class:active={aspectRatioLabel === '1:1'}
				on:click={() => updateAspectRatio(1, '1:1')}
				disabled={!canControlCropper}>1:1</button
			>
			<button
				class:active={aspectRatioLabel === '4:3'}
				on:click={() => updateAspectRatio(4 / 3, '4:3')}
				disabled={!canControlCropper}>4:3</button
			>
			<button
				class:active={aspectRatioLabel === '16:9'}
				on:click={() => updateAspectRatio(16 / 9, '16:9')}
				disabled={!canControlCropper}>16:9</button
			>
		</div>
	</div>
	<div slot="toolbar-right">
		<button
			class="apply-button button-like toolbar-button"
			on:click={handleApplyCrop}
			disabled={!canApply}
		>
			{#if isApplying}<span class="button-spinner"></span> Applying...{:else}Apply Crop{/if}
		</button>
	</div>

	<div slot="main-content" class="cropper-main-content">
		{#if imageUrl}
			<div class="cropper-container">
				<img
					bind:this={imageElement}
					src={imageUrl}
					alt={$imageEditorStore.originalFilename || 'Image to crop'}
					key={imageUrl}
					class="crop-image"
					crossorigin="anonymous"
					on:load={handleImageLoad}
					on:error={handleImageError}
					style:opacity={isLoading && !cropperInstance ? 0.5 : 1}
				/>
			</div>
		{:else if !isLoading}
			<p class="placeholder-text">Select an image to start.</p>
		{/if}
	</div>

	<svelte:fragment slot="sidebar-content" let:openFilePicker>
		<FileManagementSidebar on:openFilePicker={openFilePicker} />
		<div class="sidebar-section section-details">
			<h4 class="h4-pink">Current Selection</h4>
			{#if croppedAreaPixels && canControlCropper}
				<div class="details-grid">
					<span>W:</span> <span>{croppedAreaPixels.width}px</span>
					<span>H:</span> <span>{croppedAreaPixels.height}px</span>
					<span>X:</span> <span>{croppedAreaPixels.x}px</span>
					<span>Y:</span> <span>{croppedAreaPixels.y}px</span>
				</div>
			{:else if imageUUID && !isLoading && !isApplying}
				<p class="placeholder-text-small">Initializing crop area...</p>
			{:else if isLoading}
				<p class="placeholder-text-small">Loading...</p>
			{:else}
				<p class="placeholder-text-small">No selection.</p>
			{/if}
		</div>
		<div class="sidebar-section section-controls">
			<h4 class="h4-teal">Controls</h4>
			<div class="control-item zoom-controls">
				<label for="zoom-slider">Zoom</label>
				<input
					id="zoom-slider"
					type="range"
					min="1"
					max="500"
					step="1"
					bind:value={zoom}
					on:input={updateZoomFromSlider}
					class="zoom-slider"
					disabled={!canControlCropper}
				/>
				<span class="zoom-value">{zoom}%</span>
			</div>
		</div>
		<HistoryControlsSidebar />
		<DownloadSidebar />
	</svelte:fragment>
</ImageEditorLayout>

<style>
	.toolbar-label {
		font-size: 0.9rem;
		color: var(--base);
		font-weight: 500;
		display: inline-block;
		align-self: center;
		white-space: nowrap;
	}

	.aspect-ratio-controls {
		display: flex;
		background-color: var(--surface0);
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid var(--surface1);
		height: 32px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
		margin-left: 0.5rem;
	}

	div[slot='toolbar-left'] {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		height: 100%;
	}

	.aspect-ratio-controls button {
		background-color: var(--base);
		border: none;
		border-right: 1px solid var(--surface1);
		color: var(--text);
		padding: 0 1rem;
		height: 100%;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.15s ease;
		flex: 1;
		min-width: 40px;
	}

	.aspect-ratio-controls button:first-child {
		border-left: none;
	}

	.aspect-ratio-controls button:last-child {
		border-right: none;
	}
	.aspect-ratio-controls button:hover:not(:disabled) {
		background-color: var(--blue);
		color: var(--text);
	}

	.aspect-ratio-controls button.active {
		background-color: var(--blue);
		color: var(--crust);
		font-weight: 600;
	}

	.aspect-ratio-controls button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background-color: var(--surface0) !important;
		color: var(--overlay) !important;
		filter: grayscale(50%);
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

	.cropper-main-content {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.cropper-container {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	.crop-image {
		display: block;
		max-width: 100%;
		max-height: 100%;
		opacity: 1;
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
		color: var(--base);
		transition:
			transform 0.2s ease-out,
			box-shadow 0.2s ease-out;
		position: relative;
	}
	.sidebar-section:not(.download-section):hover {
		transform: translateY(-3px) scale(1.01);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12);
		z-index: 5;
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

	.section-file {
		background-color: var(--blue);
		color: var(--crust);
	}

	.section-details {
		background-color: var(--mantle);
		color: var(--base);
	}
	.section-details h4 {
		color: var(--flamingo);
		border-bottom-color: color-mix(in srgb, var(--flamingo) 50%, transparent);
	}

	.section-details .details-grid {
		display: grid;

		grid-template-columns: auto 1fr;

		gap: 0.4rem 1rem;
		font-size: 0.85rem;
		font-family: var(--font-mono);
		color: var(--base);
	}
	.section-details .details-grid span:nth-child(odd) {
		opacity: 0.8;
		text-align: right;
		white-space: nowrap;
		font-weight: 500;
		padding-right: 0.5em;
	}
	.section-details .details-grid span:nth-child(even) {
		font-weight: 600;
		text-align: left;
	}
	.section-details .placeholder-text-small {
		font-size: 0.8rem;
		color: var(--subtext0);
		text-align: center;
		padding: 0.5rem 0;
		margin: 0;
	}

	.section-controls {
		background-color: var(--mantle);
		color: var(--base);
	}
	.section-controls h4 {
		color: var(--teal);
		border-bottom-color: color-mix(in srgb, var(--teal) 50%, transparent);
	}
	.section-controls .control-item {
		margin-bottom: 1.2rem;
	}
	.section-controls .control-item:last-child {
		margin-bottom: 0;
	}
	.section-controls .control-item label {
		color: var(--base);
		font-weight: 500;
		display: block;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}
	.section-controls .zoom-controls {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		flex-wrap: wrap;
	}
	.section-controls .zoom-slider {
		flex-grow: 1;
		height: 8px;
		cursor: pointer;
		accent-color: var(--base);

		background: var(--surface0);
		border-radius: 4px;
		margin: 0;
		min-width: 80px;
		transition: box-shadow 0.2s ease;
	}
	.section-controls .zoom-slider:hover:not(:disabled) {
		box-shadow: 0 0 5px color-mix(in srgb, var(--base) 50%, transparent);
	}
	.section-controls .zoom-slider:disabled {
		cursor: not-allowed;
		opacity: 0.5;
		box-shadow: none;
		accent-color: var(--overlay);
		background: var(--overlay0);
	}
	.section-controls .zoom-value {
		color: var(--base);
		font-weight: 500;
		font-size: 0.9rem;
		min-width: 45px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.section-history {
		background-color: var(--teal);
		color: var(--crust);
	}
	.section-history h4 {
		color: var(--crust);

		border-bottom-color: color-mix(in srgb, var(--crust) 30%, transparent);
	}

	.section-history .history-button {
		background-color: var(--crust);
		color: var(--sky);
	}
	.section-history .history-button:hover:not(:disabled) {
		background-color: var(--mantle);
	}
	.section-history .history-button:disabled {
		background-color: var(--surface0) !important;
		color: var(--overlay) !important;
		border-color: var(--surface1) !important;
		opacity: 0.5;
		filter: grayscale(50%);
	}

	:global(.download-section .save-button) {
		background-color: var(--pink) !important;
		color: var(--crust) !important;
		border: none !important;
	}
	:global(.download-section .save-button:hover:not(:disabled)) {
		filter: brightness(1.1);
	}
	:global(.download-section .save-button:disabled) {
		background-color: var(--overlay0) !important;
		color: var(--subtext0) !important;
		opacity: 0.6;
		filter: grayscale(30%);
	}

	@media (max-width: 480px) {
		.aspect-ratio-controls button {
			padding: 0.4rem 0.6rem;
			font-size: 0.8rem;
		}
		.section-details .details-grid {
			grid-template-columns: auto 1fr;
		}
		.section-details .details-grid span {
			text-align: left;
		}
	}
</style>
