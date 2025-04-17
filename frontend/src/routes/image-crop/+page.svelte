<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';

	import {
		API_BASE_URL,
		uploadImage,
		applyCropFilter,
		getRenderImage,
		undoChanges,
		redoChanges
	} from '$lib/services/imageApi.js';

	let imageFile = null;
	let originalFilename = '';
	let imageUUID = null;
	let imageUrl = '';
	let imageElement = null;
	let cropperInstance = null;
	let isLoading = false;
	let errorMessage = '';

	let zoom = 100;
	let initialZoomRatio = 1;
	let isUpdatingFromSlider = false;
	let aspect = NaN;
	let aspectRatioLabel = 'Free';
	let croppedAreaPixels = null;

	onMount(() => {
		loadCropperAssetsIfNeeded();
	});

	onDestroy(() => {
		destroyCropperInternal();
	});

	async function loadCropperAssetsIfNeeded() {
		if (browser && typeof Cropper === 'undefined') {
			if (!document.querySelector('script[src*="cropper.min.js"]')) {
				const cropperScript = document.createElement('script');
				cropperScript.src =
					'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
				cropperScript.async = true;
				const cropperStyles = document.createElement('link');
				cropperStyles.rel = 'stylesheet';
				cropperStyles.href =
					'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
				document.head.appendChild(cropperStyles);
				return new Promise((resolve) => {
					cropperScript.onload = resolve;
					document.head.appendChild(cropperScript);
				});
			} else {
				return new Promise((resolve) => setTimeout(resolve, 100));
			}
		}
		return Promise.resolve();
	}

	function destroyCropperInternal() {
		if (cropperInstance) {
			try {
				cropperInstance.destroy();
			} catch (e) {
				errorMessage = 'Error destroying cropper instance';
			}
			cropperInstance = null;
			croppedAreaPixels = null;
		}
	}

	function handleFileSelect(event) {
		const fileInput = event.target;
		const file = fileInput.files?.[0];
		if (file) {
			imageFile = file;
			originalFilename = file.name;
			fileInput.value = null;
			handleUpload();
		} else {
			imageFile = null;
			originalFilename = '';
		}
	}

	async function handleUpload() {
		if (!imageFile) return;
		isLoading = true;
		errorMessage = '';
		destroyCropperInternal();
		imageUrl = '';
		imageUUID = null;

		try {
			const result = await uploadImage(imageFile);
			imageUUID = result.UUID;
			refreshImage();
			imageFile = null;
		} catch (error) {
			errorMessage = `Error al subir ${originalFilename || 'imagen'}: ${error.message}`;
			imageUrl = '';
			imageUUID = null;
			originalFilename = '';
			isLoading = false;
			destroyCropperInternal();
		}
	}

	function refreshImage() {
		if (!imageUUID) {
			imageUrl = '';
			isLoading = false;
			destroyCropperInternal();
			return;
		}
		isLoading = true;
		const newImageUrl = getRenderImage(imageUUID);
		imageUrl = newImageUrl + '?t=' + Date.now();
	}

	function initCropper() {
		if (!imageElement || typeof Cropper === 'undefined' || !imageUrl) {
			return;
		}
		destroyCropperInternal();
		zoom = 100;
		initialZoomRatio = 1;

		setTimeout(() => {
			if (imageElement && typeof Cropper !== 'undefined') {
				try {
					cropperInstance = new Cropper(imageElement, {
						aspectRatio: aspect,
						viewMode: 1,
						dragMode: 'move',
						autoCropArea: 0.8,
						movable: false,
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
							const imageData = cropperInstance.getImageData();
							if (imageData.naturalWidth > 0) {
								initialZoomRatio = canvasData.width / imageData.naturalWidth;
							} else {
								initialZoomRatio = 1;
							}
							zoom = 100;
							updateCropData();
						}
					});
					if (!isNaN(aspect)) {
						cropperInstance.setAspectRatio(aspect);
					}
				} catch (err) {
					errorMessage = `Failed to initialize cropper: ${err.message}`;
					destroyCropperInternal();
					isLoading = false;
				}
			} else {
				isLoading = false;
			}
		}, 100);
	}

	async function handleApplyCrop() {
		if (!cropperInstance || !imageUUID) {
			errorMessage = 'No crop area selected or image not loaded.';
			return;
		}
		isLoading = true;
		errorMessage = '';
		try {
			const cropData = cropperInstance.getData(true);
			if (!cropData || cropData.width <= 0 || cropData.height <= 0) {
				throw new Error('Invalid crop dimensions detected.');
			}
			destroyCropperInternal();
			await applyCropFilter(imageUUID, {
				x: cropData.x,
				y: cropData.y,
				width: cropData.width,
				height: cropData.height
			});
			refreshImage();
		} catch (error) {
			errorMessage = `Error al aplicar recorte: ${error.message}`;
			isLoading = false;
			if (imageUUID) refreshImage();
		}
	}

	async function handleUndo() {
		if (!imageUUID || isLoading) return;
		isLoading = true;
		errorMessage = '';
		destroyCropperInternal();
		try {
			await undoChanges(imageUUID);
			refreshImage();
		} catch (error) {
			isLoading = false;
			if (imageUUID) refreshImage();
		}
	}

	async function handleRedo() {
		if (!imageUUID || isLoading) return;
		isLoading = true;
		errorMessage = '';
		destroyCropperInternal();
		try {
			await redoChanges(imageUUID);
			refreshImage();
		} catch (error) {
			isLoading = false;
			if (imageUUID) refreshImage();
		}
	}

	function handleChangeImageClick() {
		if (isLoading) return;
		errorMessage = '';
		destroyCropperInternal();
		imageFile = null;
		originalFilename = '';
		imageUUID = null;
		imageUrl = '';
		const fileInput = document.getElementById('file-input');
		if (fileInput) {
			fileInput.click();
		} else {
			errorMessage = 'File input not found';
		}
	}

	function handleDownload() {
		if (!imageUUID || !imageUrl || isLoading) {
			return;
		}

		const urlToOpen = getRenderImage(imageUUID);
		const urlWithTimestamp = `${urlToOpen}${urlToOpen.includes('?') ? '&' : '?'}t=${Date.now()}`;

		try {
			const newTab = window.open(urlWithTimestamp, '_blank');
			if (newTab) {
				newTab.focus();
			} else {
				errorMessage =
					'Could not open image in new tab. Please check your popup blocker settings.';
			}
		} catch (error) {
			errorMessage = `Error opening image: ${error.message}`;
		}
	}

	function updateAspectRatio(newAspect, label) {
		aspect = newAspect;
		aspectRatioLabel = label;
		if (cropperInstance) {
			cropperInstance.setAspectRatio(newAspect);
		}
	}

	function updateZoomFromSlider(event) {
		if (!cropperInstance || !initialZoomRatio || !imageElement) return;
		const imgData = cropperInstance.getImageData();
		if (!imgData || imgData.naturalWidth === 0) return;

		const sliderValue = parseFloat(event.target.value);
		const safeInitialZoomRatio = initialZoomRatio > 0 ? initialZoomRatio : 1;
		const targetAbsoluteRatio = safeInitialZoomRatio * (sliderValue / 100);

		if (targetAbsoluteRatio <= 0) return;

		isUpdatingFromSlider = true;
		try {
			cropperInstance.zoomTo(targetAbsoluteRatio);
			zoom = sliderValue;
		} catch (e) {
			errorMessage = 'Error adjusting zoom';
		} finally {
			tick().then(() => {
				isUpdatingFromSlider = false;
			});
		}
	}

	function updateSliderFromCropper(event) {
		if (!cropperInstance || !initialZoomRatio || isUpdatingFromSlider || !imageElement) {
			if (isUpdatingFromSlider) {
				isUpdatingFromSlider = false;
			}
			return;
		}
		const imgData = cropperInstance.getImageData();
		if (!imgData || imgData.naturalWidth === 0) return;

		const currentAbsoluteRatio = event.detail.ratio;
		const safeInitialZoomRatio = initialZoomRatio > 0 ? initialZoomRatio : 1;
		if (safeInitialZoomRatio <= 0) return;

		const newSliderValue = Math.round((currentAbsoluteRatio / safeInitialZoomRatio) * 100);
		const minZoom = 25;
		const maxZoom = 300;
		const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newSliderValue));

		if (zoom !== clampedZoom) {
			zoom = clampedZoom;
		}
	}

	function updateCropDataFromEvent(event) {
		if (cropperInstance) {
			const data = cropperInstance.getData(true);
			updateCroppedAreaPixels(data);
		}
	}

	function updateCropData() {
		if (cropperInstance) {
			const data = cropperInstance.getData(true);
			updateCroppedAreaPixels(data);
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
		} else {
			croppedAreaPixels = null;
		}
	}

	function handleImageElementLoad() {
		errorMessage = '';
		isLoading = false;
		loadCropperAssetsIfNeeded()
			.then(() => {
				tick().then(initCropper);
			})
			.catch((err) => {
				errorMessage = 'Error loading cropping library.';
			});
	}

	function handleImageElementError() {
		errorMessage = 'Error: Could not load image preview from server.';
		isLoading = false;
		imageUrl = '';
		originalFilename = '';
		destroyCropperInternal();
	}

	$: isImageLoaded = !!imageUUID && !!imageUrl;
	$: canChange = !isLoading;
	$: canApply =
		!!cropperInstance &&
		!isLoading &&
		!!croppedAreaPixels &&
		croppedAreaPixels.width > 0 &&
		croppedAreaPixels.height > 0;
	$: canUndo = isImageLoaded && !isLoading;
	$: canRedo = isImageLoaded && !isLoading;
	$: canDownload = isImageLoaded && !isLoading;
	$: canControlCropper = !!cropperInstance && !isLoading;

	function truncateFilename(name, length = 25) {
		if (!name) return '';
		if (name.length <= length) return name;
		const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')) : '';
		const base = name.substring(0, name.lastIndexOf('.'));
		const truncatedBase =
			base.length > length - ext.length - 3
				? base.substring(0, length - ext.length - 3)
				: base;
		return `${truncatedBase}...${ext}`;
	}
</script>

<svelte:head>
	<title>Crop Image - Slurp Tools</title>
</svelte:head>

<div class="editor-wrapper">
	<div class="page-container">
		{#if !isImageLoaded && !isLoading}
			<div class="initial-upload-state" transition:fade={{ duration: 200 }}>
				<h1>Image Cropper</h1>
				<p class="tool-description">Select an image to start editing.</p>
				<div class="input-area file-input-section">
					<label for="file-input" class="file-label button-like">
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
					</label>
				</div>
				{#if errorMessage}<p class="error-message">{errorMessage}</p>{/if}
			</div>
		{:else if isLoading && !imageUrl}
			<div class="loading-state" transition:fade={{ duration: 200 }}>
				<div class="spinner"></div>
				<p>Uploading {truncateFilename(originalFilename, 30)}...</p>
			</div>
		{:else}
			<div
				class="editor-interface"
				class:loading={isLoading && isImageLoaded}
				transition:fade={{ duration: 300 }}
			>
				<div class="top-toolbar">
					<div class="toolbar-left">
						<span class="toolbar-label">Aspect Ratio:</span>
						<div class="aspect-ratio-controls">
							<button
								class:active={aspectRatioLabel === 'Free'}
								on:click={() => updateAspectRatio(NaN, 'Free')}
								disabled={!canControlCropper && !isImageLoaded}>Free</button
							>
							<button
								class:active={aspectRatioLabel === '1:1'}
								on:click={() => updateAspectRatio(1, '1:1')}
								disabled={!canControlCropper && !isImageLoaded}>1:1</button
							>
							<button
								class:active={aspectRatioLabel === '4:3'}
								on:click={() => updateAspectRatio(4 / 3, '4:3')}
								disabled={!canControlCropper && !isImageLoaded}>4:3</button
							>
							<button
								class:active={aspectRatioLabel === '16:9'}
								on:click={() => updateAspectRatio(16 / 9, '16:9')}
								disabled={!canControlCropper && !isImageLoaded}>16:9</button
							>
						</div>
					</div>
					<div class="toolbar-right">
						<button
							class="apply-button button-like toolbar-button"
							on:click={handleApplyCrop}
							disabled={!canApply}
						>
							{#if isLoading && canApply}<span class="button-spinner"></span> Applying...{:else}Apply
								Crop{/if}
						</button>
					</div>
				</div>

				<div class="main-area">
					{#if imageUrl}
						<div class="cropper-container">
							<img
								bind:this={imageElement}
								src={imageUrl}
								alt={originalFilename || 'Image to edit'}
								key={imageUrl}
								class="crop-image"
								on:load={handleImageElementLoad}
								on:error={handleImageElementError}
								crossorigin="anonymous"
							/>
						</div>
					{/if}
					{#if isLoading && isImageLoaded}
						<div class="main-area-overlay">
							<div class="spinner"></div>
							<p>Processing...</p>
						</div>
					{/if}
					{#if !imageUrl && !isLoading}
						<p class="placeholder-text">Image cleared or failed to load.</p>
					{/if}
				</div>

				<div class="right-sidebar">
					<div class="sidebar-section file-management">
						<h4 class="h4-mauve">Image</h4>
						{#if originalFilename}
							<p class="filename" title={originalFilename}>
								{truncateFilename(originalFilename)}
							</p>
						{:else if imageUUID}
							<p class="filename">
								Image loaded (ID: {imageUUID.substring(0, 8)}...)
							</p>
						{/if}
						<button
							on:click={handleChangeImageClick}
							class="button-like change-button"
							disabled={!canChange}>Change Image</button
						>
					</div>

					{#if croppedAreaPixels}
						<div class="sidebar-section details">
							<h4 class="h4-pink">Current Selection</h4>
							<div class="details-grid">
								<span>W:</span> <span>{croppedAreaPixels.width}px</span>
								<span>H:</span> <span>{croppedAreaPixels.height}px</span>
								<span>X:</span> <span>{croppedAreaPixels.x}px</span>
								<span>Y:</span> <span>{croppedAreaPixels.y}px</span>
							</div>
						</div>
					{:else if isImageLoaded}
						<div class="sidebar-section details">
							<h4 class="h4-pink">Current Selection</h4>
							<p class="placeholder-text">Initializing crop area...</p>
						</div>
					{/if}

					<div class="sidebar-section controls">
						<h4 class="h4-teal">Controls</h4>
						<div class="control-item zoom-controls">
							<label for="zoom-slider">Zoom</label>
							<input
								id="zoom-slider"
								type="range"
								min="25"
								max="300"
								step="1"
								bind:value={zoom}
								on:input={updateZoomFromSlider}
								class="zoom-slider"
								disabled={!canControlCropper}
							/>
							<span class="zoom-value">{zoom}%</span>
						</div>
						<div class="control-item history-controls">
							<button
								class="button-like history-button"
								on:click={handleUndo}
								disabled={!canUndo}
								title="Undo"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									fill="currentColor"
									viewBox="0 0 16 16"
								>
									<path
										fill-rule="evenodd"
										d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"
									/>
									<path
										d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"
									/>
								</svg>
								<span>Undo</span>
							</button>
							<button
								class="button-like history-button"
								on:click={handleRedo}
								disabled={!canRedo}
								title="Redo"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									fill="currentColor"
									viewBox="0 0 16 16"
								>
									<path
										fill-rule="evenodd"
										d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
									/>
									<path
										d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36-1.966a.25.25 0 0 1 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"
									/>
								</svg>
								<span>Redo</span>
							</button>
						</div>
					</div>

					{#if isImageLoaded}
						<div class="sidebar-section download-section">
							<button
								on:click={handleDownload}
								class="button-like save-button"
								disabled={!canDownload}
							>
								Download Image
							</button>
						</div>
					{/if}

					{#if errorMessage}<p class="error-message sidebar-error">{errorMessage}</p>{/if}
				</div>
			</div>
		{/if}

		<input
			type="file"
			id="file-input"
			accept="image/png, image/jpeg, image/webp, image/gif"
			on:change={handleFileSelect}
			style="display: none;"
		/>
	</div>
</div>

<style>
	:root {
		--toolbar-height: 60px;
		--sidebar-width: 280px;
		--grid-size: 20px;
		--grid-color: color-mix(in srgb, var(--overlay) 50%, transparent);
		--editor-v-margin: 3rem;
		--editor-fixed-height: calc(90vh - var(--editor-v-margin) - 1px); /* 1px for border */
	}

	:global(html, body) {
		height: 100%;
		margin: 0;
		padding: 0;
	}

	.editor-wrapper {
		max-width: 1400px;
		margin: calc(var(--editor-v-margin) / 2) auto;
		padding: 0 1rem;
		box-sizing: border-box;
	}

	.page-container {
		margin: 0;
		padding: 0;
		font-family: var(--font-body);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background-color: var(--base);
		color: var(--text);
		border: 1px solid var(--overlay);
		border-radius: 12px;
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
		width: 100%;
		height: var(--editor-fixed-height);
		max-height: var(--editor-fixed-height);
	}
	.initial-upload-state,
	.loading-state {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		text-align: center;
		background-color: var(--base);
		border-radius: 12px 12px 0 0;
	}
	.tool-description {
		margin-bottom: 1.5rem;
		color: var(--subtext0);
		max-width: 400px;
		line-height: 1.5;
	}
	.loading-state p {
		margin-top: 1rem;
		color: var(--overlay);
	}
	.editor-interface {
		display: grid;
		grid-template-areas: 'toolbar toolbar' 'main sidebar';
		grid-template-rows: var(--toolbar-height) 1fr;
		grid-template-columns: 1fr var(--sidebar-width);
		flex-grow: 1;
		overflow: hidden;
		background-color: var(--base);
	}

	.top-toolbar {
		grid-area: toolbar;
		background-color: var(--mantle);
		border-bottom: 1px solid var(--overlay);
		padding: 0 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: var(--toolbar-height);
		z-index: 10;
	}

	.main-area {
		grid-area: main;
		overflow: hidden;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1.2rem;
		box-sizing: border-box;
		background-color: var(--base);
		background-image:
			repeating-linear-gradient(
				rgba(255, 255, 255, 0.15) 0 1px,
				transparent 1px var(--grid-size)
			),
			repeating-linear-gradient(
				90deg,
				rgba(255, 255, 255, 0.15) 0 1px,
				transparent 1px var(--grid-size)
			);
		background-size: var(--grid-size) var(--grid-size);
	}
	.cropper-container {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.crop-image {
		display: block;
		max-width: 100%;
		max-height: 100%;
		opacity: 1;
		image-orientation: none;
		object-fit: contain;
		background-color: transparent;
	}

	.right-sidebar {
		grid-area: sidebar;
		background-color: var(--base);
		width: var(--sidebar-width);
		padding: 1.5rem;
		overflow-y: auto;
		border-left: 1px solid var(--overlay);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		color: var(--text);
		box-sizing: border-box;
		max-height: 100%;
	}
	.sidebar-section {
		border-radius: 10px;
		padding: 1.2rem 1.5rem;
		border: none;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
		transition:
			transform 0.2s ease-out,
			box-shadow 0.2s ease-out;
		position: relative;
		color: var(--text);
	}
	.sidebar-section:not(.download-section):hover {
		transform: translateY(-3px) scale(1.01);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12);
		z-index: 5;
	}
	.sidebar-section.file-management {
		background-color: var(--sapphire);
	}
	.sidebar-section.controls {
		background-color: var(--teal);
	}
	.sidebar-section.details {
		background-color: var(--pink);
	}
	.sidebar-section.download-section {
		padding: 0;
		box-shadow: none;
		background: none;
		margin-top: -0.5rem;
	}
	.sidebar-section h4 {
		font-family: var(--font-header);
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		padding-bottom: 0.6rem;
		color: var(--text);
		border-bottom: 1px solid color-mix(in srgb, var(--text) 25%, transparent);
	}
	.h4-mauve {
		color: var(--mauve);
		border-bottom-color: var(--mauve) !important;
	}
	.h4-pink {
		color: var(--pink);
		border-bottom-color: var(--pink) !important;
	}
	.h4-teal {
		color: var(--teal);
		border-bottom-color: var(--teal) !important;
	}
	.sidebar-section.file-management .filename {
		font-size: 0.85rem;
		margin-bottom: 1rem;
		background-color: var(--crust);
		color: var(--base);
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: normal;
		word-break: break-all;
		border: 1px solid var(--mantle);
		line-height: 1.4;
	}
	.placeholder-text {
		font-size: 0.9rem;
		color: color-mix(in srgb, var(--text) 70%, transparent);
		text-align: center;
		padding: 1rem 0;
	}

	.toolbar-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.toolbar-label {
		font-size: 0.9rem;
		color: var(--base);
		margin-right: 0.5rem;
	}
	.aspect-ratio-controls {
		display: flex;
		background-color: var(--mantle);
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid var(--crust);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}
	.aspect-ratio-controls button {
		background-color: transparent;
		border: none;
		border-left: 1px solid var(--crust);
		color: var(--base);
		padding: 0.5rem 0.9rem;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 500;
	}
	.aspect-ratio-controls button:first-child {
		border-left: none;
	}
	.aspect-ratio-controls button:hover:not(:disabled) {
		background-color: var(--crust);
		color: var(--lavender);
	}
	.aspect-ratio-controls button.active {
		background-color: var(--mauve);
		color: var(--crust);
		font-weight: 700;
	}
	.aspect-ratio-controls button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background-color: transparent !important;
		color: var(--overlay) !important;
		filter: grayscale(80%);
	}

	.button-like {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-family: var(--font-body);
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		text-align: center;
		transition:
			background-color 0.2s ease,
			color 0.2s ease,
			transform 0.15s ease,
			box-shadow 0.2s ease;
		text-decoration: none;
		line-height: 1.2;
		gap: 0.5rem;
		user-select: none;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		width: 100%;
		box-sizing: border-box;
	}
	.button-like:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: all !important;
		box-shadow: none;
		transform: none;
		filter: grayscale(50%);
	}
	.button-like:not(:disabled):not(.disabled):hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
		filter: brightness(1.12);
	}
	.button-like:active:not(:disabled):not(.disabled) {
		transform: translateY(0px);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		filter: brightness(0.95);
	}

	.initial-upload-state .file-label {
		border: 2px dashed var(--base);
		background-color: var(--mantle);
		color: var(--base);
		width: 100%;
		max-width: 350px;
		box-shadow: none;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease,
			color 0.2s ease;
	}
	.initial-upload-state .file-label:hover {
		background-color: var(--crust);
		border-color: var(--blue);
		color: var(--blue);
	}
	.apply-button {
		background-color: var(--green);
		color: var(--crust);
	}
	.toolbar-button {
		width: auto !important;
	}
	.change-button {
		background-color: var(--crust);
		color: var(--sapphire);
		border: 1px solid var(--mantle);
		padding: 0.6rem 1rem;
		font-size: 0.9rem;
		box-shadow: none;
	}
	.change-button:hover:not(:disabled) {
		background-color: var(--mantle);
		color: var(--lavender);
		border-color: var(--mantle);
		filter: brightness(1.1);
	}
	.save-button {
		background-color: var(--blue);
		color: var(--crust);
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
	}
	.history-button svg {
		width: 1em;
		height: 1em;
	}
	.history-button:hover:not(:disabled) {
		background-color: var(--mantle);
		filter: brightness(1.15);
	}
	.history-button:disabled {
		opacity: 0.5;
		filter: grayscale(80%);
		cursor: not-allowed;
	}

	.controls {
	}
	.control-item {
		margin-bottom: 1.2rem;
	}
	.control-item:last-child {
		margin-bottom: 0;
	}
	.control-item label {
		display: block;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
		color: var(--text);
		font-weight: 500;
	}
	.zoom-controls {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		flex-wrap: wrap;
	}
	.zoom-slider {
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
	.zoom-slider:hover:not(:disabled) {
		box-shadow: 0 0 5px color-mix(in srgb, var(--peach) 50%, transparent);
	}
	.zoom-slider:disabled {
		cursor: not-allowed;
		opacity: 0.5;
		box-shadow: none;
		accent-color: var(--overlay);
	}
	.zoom-value {
		font-size: 0.9rem;
		min-width: 45px;
		text-align: right;
		color: var(--text);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
	}
	.history-controls {
		display: flex;
		gap: 0.8rem;
		margin-top: 1rem;
		justify-content: space-between;
	}

	.details {
	}
	.details-grid {
		display: grid;
		grid-template-columns: auto 1fr auto 1fr;
		gap: 0.3rem 0.8rem;
		font-size: 0.85rem;
		font-family: var(--font-mono);
	}
	.details-grid span:nth-child(odd) {
		color: var(--text);
		opacity: 0.85;
		text-align: right;
		white-space: nowrap;
		font-weight: 500;
	}
	.details-grid span:nth-child(even) {
		color: var(--text);
		font-weight: 600;
		background: color-mix(in srgb, var(--base) 60%, transparent);
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
		font-size: 0.8rem;
		text-align: right;
	}

	.error-message {
		background-color: color-mix(in srgb, var(--red) 15%, var(--base));
		color: var(--red);
		border: 1px solid color-mix(in srgb, var(--red) 30%, transparent);
		padding: 0.8rem 1.2rem;
		border-radius: 6px;
		margin: 1rem auto 0 auto;
		text-align: center;
		font-weight: 500;
		font-size: 0.9rem;
		max-width: 90%;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		word-wrap: break-word;
	}
	.sidebar-error {
		margin: 0;
		width: 100%;
		box-sizing: border-box;
		text-align: left;
		margin-top: 0.5rem;
		background-color: color-mix(in srgb, var(--red) 20%, transparent);
		color: var(--text);
		border-color: var(--red);
	}

	.spinner {
		border: 4px solid var(--overlay);
		border-top: 4px solid var(--blue);
		border-radius: 50%;
		width: 40px;
		height: 40px;
		animation: spin 1s linear infinite;
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
	.main-area-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: color-mix(in srgb, var(--base) 75%, transparent);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		z-index: 5;
		color: var(--text);
		text-align: center;
	}
	.main-area-overlay p {
		margin-top: 1rem;
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

	@media (max-width: 900px) {
		:root {
			--editor-v-margin: 1rem;
			--editor-fixed-height: auto;
		}
		.editor-wrapper {
			margin: 0;
			padding: 0;
			max-width: 100%;
		}
		.page-container {
			border: none;
			border-radius: 0;
			box-shadow: none;
			height: auto;
			min-height: 100vh;
		}
		.editor-interface {
			grid-template-areas: 'toolbar' 'main' 'sidebar';
			grid-template-rows: var(--toolbar-height) minmax(300px, 1fr) auto;
			grid-template-columns: 1fr;
			overflow: hidden;
			height: auto;
		}
		.main-area {
			padding: 0.8rem;
		}
		.right-sidebar {
			width: 100%;
			max-height: none;
			border-left: none;
			border-top: 1px solid var(--overlay);
			box-shadow: 0 -3px 8px rgba(0, 0, 0, 0.1);
			padding: 1rem;
			gap: 1rem;
			overflow-y: visible;
			background-color: var(--base);
		}
		.download-section {
			padding: 1rem 0 0 0 !important;
		}
		.top-toolbar {
			padding: 0 1rem;
		}
		.toolbar-label {
			display: none;
		}
		.history-button span {
			display: none;
		}
		.history-button {
			flex: none;
			padding: 0.5rem;
		}
	}
	@media (max-width: 480px) {
		:root {
			--toolbar-height: 50px;
			--grid-size: 15px;
		}
		.aspect-ratio-controls button {
			padding: 0.4rem 0.6rem;
			font-size: 0.8rem;
		}
		.button-like {
			font-size: 0.9rem;
			padding: 0.6rem 1rem;
		}
		.toolbar-button {
			padding: 0.5rem 1rem;
			font-size: 0.9rem;
		}
		.sidebar-section {
			padding: 1rem 1.2rem;
		}
		.details-grid {
			font-size: 0.8rem;
			grid-template-columns: auto 1fr;
		}
		.details-grid span:nth-child(odd) {
			text-align: left;
		}
		.details-grid span:nth-child(even) {
			text-align: left;
		}
		.details-grid span:nth-child(3) {
			grid-row: 2;
			grid-column: 1 / 2;
		}
		.details-grid span:nth-child(4) {
			grid-row: 2;
			grid-column: 2 / 3;
		}
		.details-grid span:nth-child(5) {
			grid-row: 3;
			grid-column: 1 / 2;
		}
		.details-grid span:nth-child(6) {
			grid-row: 3;
			grid-column: 2 / 3;
		}
		.right-sidebar {
			padding: 1rem;
			gap: 1rem;
			max-height: none;
		}
		.editor-wrapper {
			margin: 0;
			padding: 0;
			max-width: 100%;
		}
		.page-container {
			border: none;
			border-radius: 0;
			box-shadow: none;
		}
	}
</style>
