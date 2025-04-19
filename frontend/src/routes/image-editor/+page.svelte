<!-- src/routes/image-editor/+page.svelte -->
<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';

	import { imageEditorStore } from '$lib/stores/imageEditorStore.js';
	import ImageEditorLayout from '../../components/ImageEditorLayout.svelte';
	import FileManagementSidebar from '../../components/FileManagementSidebar.svelte';
	import HistoryControlsSidebar from '../../components/HistoryControlsSidebar.svelte';
	import DownloadSidebar from '../../components/DownloadSidebar.svelte';
	import ErrorMessageDisplay from '../../components/ErrorMessageDisplay.svelte';

	import { loadCropperAssetsIfNeeded, destroyCropperInstance } from '$lib/utils/cropperUtils.js';
	import {
		applyCropFilter,
		applyResizeFilter,
		applyRotateFilter
	} from '$lib/services/imageApi.js';

	let activeTool = 'crop';

	let imageUUID = null,
		imageUrl = '',
		isLoading = false,
		isApplying = false,
		originalFilename = '',
		imageInfo = null,
		originalDimensions = null,
		storeErrorMessage = '',
		currentBlobUrl = null;
	let unsubscribeStore = () => {};

	let imageElement = null;

	let cropperInstance = null;
	let crop_zoom = 100;
	let crop_initialZoomRatio = 1;
	let crop_isUpdatingFromSlider = false;
	let crop_aspect = NaN;
	let crop_aspectRatioLabel = 'Free';
	let crop_croppedAreaPixels = null;
	async function initializeCropper() {
		if (activeTool !== 'crop') return;
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
		const instanceToDestroy = cropperInstance;
		cropperInstance = null;
		destroyCropperInstance(instanceToDestroy);

		await tick();
		if (
			imageElement &&
			typeof Cropper !== 'undefined' &&
			!cropperInstance &&
			!isLoading &&
			!isApplying &&
			activeTool === 'crop'
		) {
			try {
				cropperInstance = new Cropper(imageElement, {
					aspectRatio: crop_aspect,
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
					crop: crop_updateCropDataFromEvent,
					zoom: crop_updateSliderFromCropper,
					ready: () => {
						const canvasData = cropperInstance?.getCanvasData();
						const imgData = cropperInstance?.getImageData();
						if (canvasData && imgData) {
							crop_initialZoomRatio =
								imgData.naturalWidth > 0
									? canvasData.width / imgData.naturalWidth
									: 1;
						} else {
							crop_initialZoomRatio = 1;
						}
						crop_zoom = 100;
						crop_updateCropData();
					}
				});
				if (!isNaN(crop_aspect)) {
					cropperInstance.setAspectRatio(crop_aspect);
				}
			} catch (err) {
				imageEditorStore.imageLoadError(`Failed to initialize cropper: ${err.message}`);
				cropperInstance = destroyCropperInstance(cropperInstance);
			}
		}
	}
	function crop_updateCropDataFromEvent(event) {
		if (cropperInstance && !isApplying) {
			crop_updateCroppedAreaPixels(cropperInstance.getData(true));
		}
	}
	function crop_updateCropData() {
		if (cropperInstance && !isApplying) {
			crop_updateCroppedAreaPixels(cropperInstance.getData(true));
		} else {
			crop_croppedAreaPixels = null;
		}
	}
	function crop_updateCroppedAreaPixels(data) {
		if (data && data.width > 0 && data.height > 0) {
			crop_croppedAreaPixels = {
				x: Math.round(data.x),
				y: Math.round(data.y),
				width: Math.round(data.width),
				height: Math.round(data.height)
			};
		} else if (!data || data.width <= 0 || data.height <= 0) {
			crop_croppedAreaPixels = null;
		}
	}
	function crop_updateAspectRatio(newAspect, label) {
		if (isLoading || isApplying) return;
		crop_aspect = newAspect;
		crop_aspectRatioLabel = label;
		if (cropperInstance) {
			cropperInstance.setAspectRatio(newAspect);
		}
	}
	function crop_updateZoomFromSlider(event) {
		if (!cropperInstance || crop_initialZoomRatio <= 0 || isLoading || isApplying) return;
		const imgData = cropperInstance.getImageData();
		if (!imgData || imgData.naturalWidth === 0) return;
		const sliderValue = parseFloat(event.target.value);
		const targetAbsoluteRatio = crop_initialZoomRatio * (sliderValue / 100);
		if (targetAbsoluteRatio <= 0) return;
		crop_isUpdatingFromSlider = true;
		try {
			cropperInstance.zoomTo(targetAbsoluteRatio);
		} catch (e) {
		} finally {
			tick().then(() => {
				crop_isUpdatingFromSlider = false;
			});
		}
	}
	function crop_updateSliderFromCropper(event) {
		if (
			!cropperInstance ||
			crop_initialZoomRatio <= 0 ||
			crop_isUpdatingFromSlider ||
			isLoading ||
			isApplying
		) {
			if (crop_isUpdatingFromSlider) crop_isUpdatingFromSlider = false;
			return;
		}
		const imgData = cropperInstance.getImageData();
		if (!imgData || imgData.naturalWidth === 0) return;
		const currentAbsoluteRatio = event.detail.ratio;
		const newSliderValue = Math.round((currentAbsoluteRatio / crop_initialZoomRatio) * 100);
		const minZoom = 1;
		const maxZoom = 500;
		const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newSliderValue));
		if (crop_zoom !== clampedZoom) {
			crop_zoom = clampedZoom;
		}
	}
	async function handleApplyCrop() {
		if (!cropperInstance || !imageUUID || isApplying || isLoading) return;
		const cropData = cropperInstance.getData(true);
		if (!cropData || cropData.width <= 0 || cropData.height <= 0) {
			return;
		}
		const instanceToDestroy = cropperInstance;
		cropperInstance = null;
		destroyCropperInstance(instanceToDestroy);
		crop_croppedAreaPixels = null;
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
	$: crop_canControlCropper = !!cropperInstance && !isLoading && !isApplying;
	$: crop_canApply =
		crop_canControlCropper &&
		!!crop_croppedAreaPixels &&
		crop_croppedAreaPixels.width > 0 &&
		crop_croppedAreaPixels.height > 0;

	const RESIZE_MAX_DIMENSION = 5000;
	let resize_targetWidth = '';
	let resize_targetHeight = '';
	let resize_keepAspectRatio = true;
	let resize_isUpdatingProgrammatically = false;
	let resize_localErrorMessage = '';
	function initializeTargetDimensions(origW, origH) {
		if (!origW || !origH) return;
		resize_isUpdatingProgrammatically = true;
		let w = Math.max(1, Math.min(origW, RESIZE_MAX_DIMENSION));
		let h = Math.max(1, Math.min(origH, RESIZE_MAX_DIMENSION));
		const ratio = origW / origH;
		if (
			resize_keepAspectRatio &&
			(origW > RESIZE_MAX_DIMENSION || origH > RESIZE_MAX_DIMENSION)
		) {
			if (w > h) {
				w = RESIZE_MAX_DIMENSION;
				h = Math.max(1, Math.round(w / ratio));
				h = Math.min(h, RESIZE_MAX_DIMENSION);
			} else {
				h = RESIZE_MAX_DIMENSION;
				w = Math.max(1, Math.round(h * ratio));
				w = Math.min(w, RESIZE_MAX_DIMENSION);
			}
		}
		resize_targetWidth = w;
		resize_targetHeight = h;
		tick().then(() => (resize_isUpdatingProgrammatically = false));
	}
	function resize_updateHeightFromWidth() {
		if (
			resize_isUpdatingProgrammatically ||
			!resize_keepAspectRatio ||
			!originalDimensions ||
			typeof resize_targetWidth !== 'number' ||
			resize_targetWidth <= 0
		)
			return;
		resize_isUpdatingProgrammatically = true;
		resize_localErrorMessage = '';
		let newWidth = Math.max(1, Math.min(resize_targetWidth, RESIZE_MAX_DIMENSION));
		if (newWidth !== resize_targetWidth) resize_targetWidth = newWidth;
		const ratio = originalDimensions.width / originalDimensions.height;
		if (isNaN(ratio) || ratio <= 0 || originalDimensions.height === 0) {
			tick().then(() => (resize_isUpdatingProgrammatically = false));
			return;
		}
		const newHeight = Math.round(newWidth / ratio);
		const finalHeight = Math.max(1, Math.min(newHeight, RESIZE_MAX_DIMENSION));
		if (resize_targetHeight !== finalHeight) resize_targetHeight = finalHeight;
		tick().then(() => (resize_isUpdatingProgrammatically = false));
	}
	function resize_updateWidthFromHeight() {
		if (
			resize_isUpdatingProgrammatically ||
			!resize_keepAspectRatio ||
			!originalDimensions ||
			typeof resize_targetHeight !== 'number' ||
			resize_targetHeight <= 0
		)
			return;
		resize_isUpdatingProgrammatically = true;
		resize_localErrorMessage = '';
		let newHeight = Math.max(1, Math.min(resize_targetHeight, RESIZE_MAX_DIMENSION));
		if (newHeight !== resize_targetHeight) resize_targetHeight = newHeight;
		const ratio = originalDimensions.width / originalDimensions.height;
		if (isNaN(ratio) || ratio <= 0) {
			tick().then(() => (resize_isUpdatingProgrammatically = false));
			return;
		}
		const newWidth = Math.round(newHeight * ratio);
		const finalWidth = Math.max(1, Math.min(newWidth, RESIZE_MAX_DIMENSION));
		if (resize_targetWidth !== finalWidth) resize_targetWidth = finalWidth;
		tick().then(() => (resize_isUpdatingProgrammatically = false));
	}
	function resize_handleKeepAspectRatioToggle() {
		if (resize_keepAspectRatio && originalDimensions) {
			resize_updateHeightFromWidth();
		}
	}
	async function handleApplyResize() {
		resize_localErrorMessage = '';
		const widthNum = Number(resize_targetWidth);
		const heightNum = Number(resize_targetHeight);
		if (!imageUUID || isLoading || isApplying) return;
		if (isNaN(widthNum) || isNaN(heightNum) || widthNum <= 0 || heightNum <= 0) {
			resize_localErrorMessage = 'Invalid dimensions.';
			return;
		}
		if (widthNum > RESIZE_MAX_DIMENSION || heightNum > RESIZE_MAX_DIMENSION) {
			resize_localErrorMessage = `Max dimension is ${RESIZE_MAX_DIMENSION}px.`;
			return;
		}
		if (!originalDimensions) {
			resize_localErrorMessage = 'Original dimensions not loaded.';
			return;
		}
		await imageEditorStore.applyFilter(
			(uuid) => applyResizeFilter(uuid, widthNum, heightNum),
			'Resize'
		);
	}
	$: resize_isValidInput =
		typeof resize_targetWidth === 'number' &&
		resize_targetWidth > 0 &&
		resize_targetWidth <= RESIZE_MAX_DIMENSION &&
		typeof resize_targetHeight === 'number' &&
		resize_targetHeight > 0 &&
		resize_targetHeight <= RESIZE_MAX_DIMENSION;
	$: resize_canApply =
		!!imageUUID && !!originalDimensions && !isLoading && !isApplying && resize_isValidInput;

	let rotate_rotationAngle = 0;
	function rotate_setRotation(angle) {
		if (isLoading || isApplying) return;
		rotate_rotationAngle = angle;
	}
	async function handleApplyRotate() {
		if (!imageUUID || isLoading || isApplying) return;
		const angleNum = Number(rotate_rotationAngle);
		if (isNaN(angleNum)) {
			return;
		}
		await imageEditorStore.applyFilter(
			(uuid) => applyRotateFilter(uuid, angleNum),
			`Rotate ${angleNum}°`
		);
	}
	$: rotate_canApply = !!imageUUID && !isLoading && !isApplying;

	async function setActiveTool(tool) {
		if (isLoading || isApplying || tool === activeTool) return;

		if (activeTool === 'crop' && tool !== 'crop') {
			const instanceToDestroy = cropperInstance;
			cropperInstance = null;
			destroyCropperInstance(instanceToDestroy);
		}
		activeTool = tool;
		if (tool === 'crop' && imageUUID && !isLoading && !isApplying) {
			try {
				await loadCropperAssetsIfNeeded();
				await tick();
				initializeCropper();
			} catch (err) {
				imageEditorStore.imageLoadError('Failed to load cropping library.');
			}
		} else if (tool === 'resize' && originalDimensions && !isLoading && !isApplying) {
			initializeTargetDimensions(originalDimensions.width, originalDimensions.height);
		}
	}

	async function handleImageLoad(event) {
		if (!event.target) return;
		const target = event.target;
		const dimensions = { width: target.naturalWidth, height: target.naturalHeight };

		imageEditorStore.imageLoadComplete(dimensions);
		await tick();
		if (activeTool === 'crop' && !isLoading && !isApplying) {
			try {
				await loadCropperAssetsIfNeeded();
				await tick();
				initializeCropper();
			} catch (err) {
				imageEditorStore.imageLoadError('Failed to load cropping library.');
			}
		} else if (activeTool === 'resize' && originalDimensions && !isLoading && !isApplying) {
			initializeTargetDimensions(originalDimensions.width, originalDimensions.height);
		}
	}
	function handleImageError() {
		imageEditorStore.imageLoadError('Error: Failed to load image preview.');
		const instanceToDestroy = cropperInstance;
		cropperInstance = null;
		destroyCropperInstance(instanceToDestroy);
	}

	onMount(() => {
		unsubscribeStore = imageEditorStore.subscribe((state) => {
			imageUUID = state.imageUUID;
			if (imageUrl !== state.imageUrl) {
				imageUrl = state.imageUrl;
				currentBlobUrl = state.currentBlobUrl;
				if (cropperInstance) {
					const instanceToDestroy = cropperInstance;
					cropperInstance = null;
					destroyCropperInstance(instanceToDestroy);
					crop_croppedAreaPixels = null;
				}
			}
			isLoading = state.isLoading;
			isApplying = state.isApplying;
			originalFilename = state.originalFilename;
			imageInfo = state.imageInfo;
			if (originalDimensions !== state.originalDimensions) {
				originalDimensions = state.originalDimensions;
				if (activeTool === 'resize' && originalDimensions && !isLoading && !isApplying) {
					initializeTargetDimensions(originalDimensions.width, originalDimensions.height);
				} else if (!originalDimensions) {
					resize_targetWidth = '';
					resize_targetHeight = '';
				}
			}
			storeErrorMessage = state.errorMessage;
		});

		loadCropperAssetsIfNeeded().catch((err) => {});
	});
	onDestroy(() => {
		if (unsubscribeStore) unsubscribeStore();
		const instanceToDestroy = cropperInstance;
		cropperInstance = null;
		destroyCropperInstance(instanceToDestroy);
		imageEditorStore.cleanupBlobUrl();
	});

	$: isBusy = isLoading || isApplying;
	$: displayError = resize_localErrorMessage || storeErrorMessage;
</script>

<svelte:head>
	<title>Image Editor - Slurp Tools</title>
</svelte:head>

<ImageEditorLayout
	toolTitle="All-in-One Image Editor"
	toolDescription="Crop, resize, or rotate your image."
>
	<div slot="toolbar-left" class="tool-switcher">
		<button
			class:active={activeTool === 'crop'}
			on:click={() => setActiveTool('crop')}
			disabled={isBusy}>Crop</button
		>
		<button
			class:active={activeTool === 'resize'}
			on:click={() => setActiveTool('resize')}
			disabled={isBusy}>Resize</button
		>
		<button
			class:active={activeTool === 'rotate'}
			on:click={() => setActiveTool('rotate')}
			disabled={isBusy}>Rotate</button
		>
	</div>

	<div slot="toolbar-right"></div>

	<div slot="main-content" class="editor-main-content">
		{#if imageUrl}
			<div class="img-preview-container">
				<img
					bind:this={imageElement}
					src={imageUrl}
					alt={originalFilename || 'Image to edit'}
					key={imageUrl}
					class="preview-image"
					on:load={handleImageLoad}
					on:error={handleImageError}
					crossorigin="anonymous"
					style:opacity={isBusy ? 0.7 : 1}
					style:visibility={activeTool === 'crop' && !cropperInstance && !isLoading
						? 'hidden'
						: 'visible'}
				/>
			</div>
		{:else if !isLoading}{/if}
	</div>

	<svelte:fragment slot="sidebar-content" let:openFilePicker>
		{#if imageUUID || currentBlobUrl}
			<FileManagementSidebar on:openFilePicker={openFilePicker} />
		{/if}

		{#if activeTool === 'crop'}
			<div class="sidebar-section section-crop" transition:fade={{ duration: 150 }}>
				<h4 class="h4-blue">Crop Options</h4>
				<div class="control-item zoom-controls">
					<label for="crop-zoom-slider">Zoom</label>
					<input
						id="crop-zoom-slider"
						type="range"
						min="1"
						max="500"
						step="1"
						bind:value={crop_zoom}
						on:input={crop_updateZoomFromSlider}
						class="zoom-slider"
						disabled={!crop_canControlCropper}
					/> <span class="zoom-value">{crop_zoom}%</span>
				</div>
				{#if crop_croppedAreaPixels && crop_canControlCropper}
					<div class="control-item details">
						<span class="control-label">Selection (px)</span>
						<div class="details-grid">
							<span>W:</span> <span>{crop_croppedAreaPixels.width}</span>
							<span>H:</span> <span>{crop_croppedAreaPixels.height}</span>
							<span>X:</span> <span>{crop_croppedAreaPixels.x}</span> <span>Y:</span>
							<span>{crop_croppedAreaPixels.y}</span>
						</div>
					</div>
				{:else if imageUUID && !isLoading}
					<div class="control-item details">
						<span class="control-label">Selection (px)</span>
						<p class="placeholder-text-small">Initializing...</p>
					</div>
				{/if}
				<button
					class="button-like apply-button apply-crop"
					on:click={handleApplyCrop}
					disabled={!crop_canApply}
				>
					{#if isApplying && activeTool === 'crop'}<span class="button-spinner"></span> Applying...{:else}Apply
						Crop{/if}
				</button>
			</div>
		{/if}

		{#if activeTool === 'resize'}
			<div class="sidebar-section section-resize" transition:fade={{ duration: 150 }}>
				<h4 class="h4-pink">Resize Options</h4>
				{#if originalDimensions}
					<p class="original-dims-info">
						Current: {originalDimensions.width} x {originalDimensions.height} px
					</p>
					<div class="dimension-inputs">
						<div class="input-group">
							<label for="resize-width">Width (px)</label>
							<input
								type="number"
								id="resize-width"
								bind:value={resize_targetWidth}
								min="1"
								max={RESIZE_MAX_DIMENSION}
								disabled={isBusy || !originalDimensions}
								on:input={resize_updateHeightFromWidth}
								placeholder="Width"
							/>
						</div>
						<div class="input-group">
							<label for="resize-height">Height (px)</label>
							<input
								type="number"
								id="resize-height"
								bind:value={resize_targetHeight}
								min="1"
								max={RESIZE_MAX_DIMENSION}
								disabled={isBusy || !originalDimensions}
								on:input={resize_updateWidthFromHeight}
								placeholder="Height"
							/>
						</div>
					</div>
					<div class="aspect-toggle">
						<label title="Maintain aspect ratio">
							<input
								type="checkbox"
								bind:checked={resize_keepAspectRatio}
								disabled={isBusy || !originalDimensions}
								on:change={resize_handleKeepAspectRatioToggle}
							/> <span>Lock aspect ratio</span>
						</label>
					</div>
				{:else if imageUUID && isLoading}
					<p class="placeholder-text">Loading dimensions...</p>
				{:else}
					<p class="placeholder-text">Load image first.</p>
				{/if}
				<button
					class="button-like apply-button apply-resize"
					on:click={handleApplyResize}
					disabled={!resize_canApply}
				>
					{#if isApplying && activeTool === 'resize'}<span class="button-spinner"></span> Applying...{:else}Apply
						Resize{/if}
				</button>
			</div>
		{/if}

		{#if activeTool === 'rotate'}
			<div class="sidebar-section section-rotate" transition:fade={{ duration: 150 }}>
				<h4 class="h4-maroon">Rotate Options</h4>
				<div class="control-item rotation-slider-group">
					<label for="rotation-slider">Angle</label>
					<div class="slider-container">
						<input
							id="rotation-slider"
							type="range"
							min="-180"
							max="180"
							step="1"
							bind:value={rotate_rotationAngle}
							class="rotation-slider"
							disabled={isBusy || !imageUUID}
						/> <span class="rotation-value">{rotate_rotationAngle}°</span>
					</div>
				</div>
				<div class="control-item quick-rotate-buttons">
					<button
						class="button-like quick-button"
						on:click={() => rotate_setRotation(-90)}
						disabled={isBusy || !imageUUID}>-90°</button
					>
					<button
						class="button-like quick-button"
						on:click={() => rotate_setRotation(0)}
						disabled={isBusy || !imageUUID}>0°</button
					>
					<button
						class="button-like quick-button"
						on:click={() => rotate_setRotation(90)}
						disabled={isBusy || !imageUUID}>+90°</button
					>
					<button
						class="button-like quick-button"
						on:click={() => rotate_setRotation(180)}
						disabled={isBusy || !imageUUID}>180°</button
					>
				</div>
				<button
					class="button-like apply-button apply-rotate"
					on:click={handleApplyRotate}
					disabled={!rotate_canApply}
				>
					{#if isApplying && activeTool === 'rotate'}<span class="button-spinner"></span> Applying...{:else}Apply
						Rotation{/if}
				</button>
			</div>
		{/if}

		{#if imageUUID}
			<HistoryControlsSidebar />

			<DownloadSidebar />
		{/if}

		{#if displayError}
			<div class="sidebar-error-container">
				<ErrorMessageDisplay message={displayError} context="sidebar" />
			</div>
		{/if}
	</svelte:fragment>
</ImageEditorLayout>

<style>
	.tool-switcher {
		display: flex;
		align-items: center;
		background-color: var(--base);
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid var(--surface1);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		height: 36px;
	}
	.tool-switcher button {
		background-color: var(--base);
		border: none;
		border-right: 1px solid var(--surface1);
		color: var(--subtext1);
		padding: 0 1.2rem;
		height: 100%;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 500;
	}
	.tool-switcher button:last-child {
		border-right: none;
	}
	.tool-switcher button:hover:not(:disabled) {
		background-color: var(--surface0);
		color: var(--text);
	}
	.tool-switcher button.active {
		background-color: var(--blue);
		color: var(--crust);
		font-weight: 700;
	}
	.tool-switcher button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background-color: var(--surface0) !important;
		color: var(--overlay) !important;
	}

	.editor-main-content {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.img-preview-container {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.preview-image {
		display: block;
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		image-orientation: none;
		transition: opacity 0.1s linear;
	}
	.placeholder-text {
		font-size: 0.9rem;
		color: var(--subtext0);
		text-align: center;
		padding: 1rem 0;
	}
	.placeholder-text-small {
		font-size: 0.8rem;
		color: var(--surface2);
		text-align: center;
		padding: 0.5rem 0;
		margin: 0;
	}

	.sidebar-section {
		padding: 1.2rem 1.5rem;
		border-radius: 10px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
		margin-bottom: 1.5rem;
		background-color: var(--mantle);
		color: var(--text);
	}
	.sidebar-section:last-child {
		margin-bottom: 0;
	}
	.sidebar-section h4 {
		font-family: var(--font-header);
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		padding-bottom: 0.6rem;
		color: inherit;
		border-bottom: 1px solid color-mix(in srgb, currentColor 30%, transparent);
	}
	.control-label {
		display: block;
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
		color: inherit;
		opacity: 0.9;
		font-weight: 500;
	}
	.control-item {
		margin-bottom: 1.2rem;
	}
	.control-item:last-child {
		margin-bottom: 0;
	}
	.apply-button {
		color: var(--crust);
		margin-top: 1rem;
		width: 100%;
		font-weight: 600;
	}
	.button-spinner {
		border: 2px solid color-mix(in srgb, var(--crust) 50%, transparent);
		border-top: 2px solid var(--crust);
		border-radius: 50%;
		width: 1em;
		height: 1em;
		animation: spin 0.8s linear infinite;
		display: inline-block;
		vertical-align: middle;
		margin-right: 0.5em;
	}
	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.section-crop {
		background-color: var(--blue);
		color: var(--base);
	}
	.section-resize {
		background-color: var(--pink);
		color: var(--text);
	}
	.section-rotate {
		background-color: var(--maroon);
		color: var(--text);
	}
	.download-section {
		padding: 0;
		box-shadow: none;
		background: none;
		margin-top: -0.5rem;
	}
	.sidebar-error-container {
		margin-top: 0;
	}

	.section-crop .control-label,
	.section-crop .zoom-value {
		color: var(--base);
	}
	.section-crop .aspect-ratio-controls {
		background-color: var(--base);
		border-color: var(--surface1);
	}
	.section-crop .aspect-ratio-controls button {
		background-color: var(--mantle);
		border-color: var(--surface1);
		color: var(--text);
	}
	.section-crop .aspect-ratio-controls button:hover:not(:disabled) {
		background-color: var(--surface0);
	}
	.section-crop .aspect-ratio-controls button.active {
		background-color: var(--blue);
		color: var(--crust);
	}
	.section-crop .zoom-slider {
		accent-color: var(--peach);
		background: var(--overlay);
	}
	.section-crop .details-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.3rem 0.8rem;
		font-size: 0.8rem;
		font-family: var(--font-mono);
		color: var(--base);
	}
	.section-crop .details-grid span:nth-child(odd) {
		opacity: 0.8;
		text-align: right;
		white-space: nowrap;
		font-weight: 500;
		padding-right: 0.5em;
		color: inherit;
	}
	.section-crop .details-grid span:nth-child(even) {
		font-weight: 600;
		text-align: left;
		color: inherit;
		background: color-mix(in srgb, var(--base) 15%, transparent);
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
	}
	.apply-crop {
		background-color: var(--green);
		border: none;
	}

	.section-resize .original-dims-info {
		color: color-mix(in srgb, var(--text) 80%, transparent);
		background: color-mix(in srgb, var(--text) 10%, transparent);
		padding: 0.3rem 0.6rem;
		border-radius: 3px;
		font-size: 0.8rem;
		margin-bottom: 1rem;
		text-align: center;
	}
	.section-resize .dimension-inputs {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.section-resize .input-group {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		flex: 1;
	}
	.section-resize .input-group label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text);
		opacity: 0.9;
	}
	.section-resize .input-group input[type='number'] {
		width: 100%;
		padding: 0.5rem 0.8rem;
		border: 1px solid var(--overlay);
		border-radius: 6px;
		font-size: 0.9rem;
		background-color: var(--base);
		color: var(--text);
		box-sizing: border-box;
		appearance: textfield;
	}
	.section-resize .input-group input[type='number']::-webkit-outer-spin-button,
	.section-resize .input-group input[type='number']::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.section-resize .input-group input:focus {
		outline: none;
		border-color: var(--mauve);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--mauve) 30%, transparent);
	}
	.section-resize .input-group input:disabled {
		background-color: var(--surface1);
		opacity: 0.7;
		cursor: not-allowed;
	}
	.section-resize .aspect-toggle label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		cursor: pointer;
		color: var(--text);
	}
	.section-resize .aspect-toggle input[type='checkbox'] {
		accent-color: var(--mauve);
		cursor: pointer;
		width: 16px;
		height: 16px;
	}
	.section-resize .aspect-toggle input[type='checkbox']:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
	.apply-resize {
		background-color: var(--green);
		border: none;
	}

	.section-rotate label,
	.section-rotate .rotation-value {
		color: var(--text);
	}
	.section-rotate .rotation-slider-group .slider-container {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.section-rotate .rotation-slider {
		flex-grow: 1;
		height: 8px;
		cursor: pointer;
		accent-color: var(--peach);
		background: var(--overlay);
		border-radius: 4px;
		margin: 0;
		min-width: 80px;
	}
	.section-rotate .rotation-slider:hover:not(:disabled) {
		box-shadow: 0 0 5px color-mix(in srgb, var(--peach) 50%, transparent);
	}
	.section-rotate .rotation-slider:disabled {
		cursor: not-allowed;
		opacity: 0.5;
		box-shadow: none;
		accent-color: var(--overlay);
		background: var(--overlay0);
	}
	.section-rotate .rotation-value {
		font-weight: 500;
		font-size: 0.9rem;
		min-width: 45px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.section-rotate .quick-rotate-buttons {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.section-rotate .quick-button {
		width: 100%;
		padding: 0.4rem 0.5rem;
		font-size: 0.8rem;
		background-color: var(--crust);
		color: var(--flamingo);
		border: 1px solid var(--mantle);
		box-shadow: none;
	}
	.section-rotate .quick-button:hover:not(:disabled) {
		background-color: var(--mantle);
		filter: brightness(1.15);
	}
	.section-rotate .quick-button:disabled {
		opacity: 0.5;
		filter: grayscale(80%);
		cursor: not-allowed;
		background-color: var(--surface0) !important;
		color: var(--overlay) !important;
		border-color: var(--surface1) !important;
	}
	.apply-rotate {
		background-color: var(--green);
		border: none;
	}

	.error-message.sidebar-error {
		margin: 0;
		width: 100%;
		box-sizing: border-box;
		text-align: left;
		background-color: color-mix(in srgb, var(--red) 20%, var(--mantle));
		color: var(--red);
		border: 1px solid var(--red);
		border-radius: 6px;
		padding: 0.6rem 1rem;
		font-size: 0.85rem;
	}
</style>
