<!-- src/routes/image-editor/+page.svelte -->
<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';

	// Import ALL API functions
	import {
		API_BASE_URL,
		uploadImage,
		applyCropFilter,
		applyResizeFilter,
		applyRotateFilter,
		getRenderImage,
		undoChanges,
		redoChanges
	} from '$lib/services/imageApi.js';

	// --- Constants ---
	const MAX_DIMENSION = 5000; // Resize Limit

	// --- Core State ---
	let imageFile = null;
	let originalFilename = '';
	let imageUUID = null;
	let imageUrl = '';
	let isLoading = false;
	let isApplying = false; // Specific loading state for apply actions
	let errorMessage = '';
	let activeTool = 'crop'; // 'crop', 'resize', 'rotate'

	// --- Crop State ---
	let imageElement = null;
	let cropperInstance = null;
	let zoom = 100;
	let initialZoomRatio = 1;
	let isUpdatingFromSlider = false;
	let aspect = NaN;
	let aspectRatioLabel = 'Free';
	let croppedAreaPixels = null;

	// --- Resize State ---
	let originalDimensions = null;
	let targetWidth = '';
	let targetHeight = '';
	let keepAspectRatio = true;
	let isUpdatingProgrammatically = false;

	// --- Rotate State ---
	let rotationAngle = 0;

	// --- Lifecycle Hooks ---
	onMount(() => {
		loadCropperAssetsIfNeeded();
	});

	onDestroy(() => {
		destroyCropperInternal();
	});

	// --- Tool Switching ---
	async function setActiveTool(tool) {
		if (isLoading || isApplying) return;
		const previousTool = activeTool;
		activeTool = tool;
		if (previousTool === 'crop' && tool !== 'crop') {
			destroyCropperInternal();
		}
		if (tool === 'crop' && isImageLoaded && !cropperInstance) {
			await tick();
			initCropper();
		}
	}

	// --- Cropper Asset Loading ---
	async function loadCropperAssetsIfNeeded() {
		if (browser && typeof Cropper === 'undefined') {
			const scriptExists = !!document.querySelector('script[src*="cropper.min.js"]');
			const styleExists = !!document.querySelector('link[href*="cropper.min.css"]');
			const loadPromises = [];
			if (!styleExists) {
				const cropperStyles = document.createElement('link');
				cropperStyles.rel = 'stylesheet';
				cropperStyles.href =
					'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
				document.head.appendChild(cropperStyles);
			}
			if (!scriptExists) {
				const cropperScript = document.createElement('script');
				cropperScript.src =
					'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
				cropperScript.async = true;
				loadPromises.push(
					new Promise((resolve, reject) => {
						cropperScript.onload = resolve;
						cropperScript.onerror = reject;
						document.head.appendChild(cropperScript);
					})
				);
			} else if (typeof Cropper === 'undefined') {
				loadPromises.push(new Promise((resolve) => setTimeout(resolve, 150)));
			}
			if (loadPromises.length > 0) {
				try {
					await Promise.all(loadPromises);
				} catch (err) {
					errorMessage = 'Failed to load cropping library.';
					console.error(err);
				}
			}
		}
	}

	// --- File Selection & Upload ---
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
		if (!imageFile) {
			errorMessage = 'No file selected for upload.';
			isLoading = false;
			return;
		}
		isLoading = true;
		isApplying = false;
		errorMessage = '';
		// Selective Reset BEFORE Upload
		destroyCropperInternal();
		imageUrl = '';
		imageUUID = null;
		originalDimensions = null;
		targetWidth = '';
		targetHeight = '';
		keepAspectRatio = true;
		rotationAngle = 0;
		zoom = 100;
		croppedAreaPixels = null;
		initialZoomRatio = 1;
		aspect = NaN;
		aspectRatioLabel = 'Free';
		try {
			console.log('Uploading image:', originalFilename);
			const result = await uploadImage(imageFile);
			imageUUID = result.UUID;
			await fetchInitialDimensions(imageUUID);
			refreshImage();
			imageFile = null;
		} catch (error) {
			console.error('Upload failed:', error);
			errorMessage = `Error uploading ${originalFilename || 'image'}: ${error.message}`;
			resetAllState();
			isLoading = false;
		}
	}

	// --- Fetch Initial Dimensions ---
	async function fetchInitialDimensions(uuid) {
		return new Promise((resolve) => {
			if (!uuid) {
				originalDimensions = null;
				return resolve();
			}
			const tempImg = new Image();
			tempImg.onload = () => {
				originalDimensions = { width: tempImg.naturalWidth, height: tempImg.naturalHeight };
				targetWidth = Math.min(originalDimensions.width, MAX_DIMENSION);
				targetHeight = Math.min(originalDimensions.height, MAX_DIMENSION);
				if (
					keepAspectRatio &&
					(originalDimensions.width > MAX_DIMENSION ||
						originalDimensions.height > MAX_DIMENSION)
				) {
					adjustDimensionsToMaxWithAspect(
						originalDimensions.width,
						originalDimensions.height
					);
				}
				resolve();
			};
			tempImg.onerror = () => {
				originalDimensions = null;
				resolve();
			};
			tempImg.crossOrigin = 'anonymous';
			tempImg.src = getRenderImage(uuid) + '?t=' + Date.now();
		});
	}
	function adjustDimensionsToMaxWithAspect(origW, origH) {
		if (origW <= MAX_DIMENSION && origH <= MAX_DIMENSION) {
			targetWidth = origW;
			targetHeight = origH;
			return;
		}
		const ratio = origW / origH;
		if (origW > origH) {
			targetWidth = MAX_DIMENSION;
			targetHeight = Math.max(1, Math.round(MAX_DIMENSION / ratio));
		} else {
			targetHeight = MAX_DIMENSION;
			targetWidth = Math.max(1, Math.round(MAX_DIMENSION * ratio));
		}
		targetWidth = Math.min(targetWidth, MAX_DIMENSION);
		targetHeight = Math.min(targetHeight, MAX_DIMENSION);
	}

	// --- Image Update & Display ---
	function refreshImage() {
		if (!imageUUID) {
			resetAllState();
			isLoading = false;
			isApplying = false;
			return;
		}
		isLoading = true;
		isApplying = false;
		imageUrl = getRenderImage(imageUUID) + '?t=' + Date.now();
	}
	function handleImageElementLoad() {
		errorMessage = '';
		isLoading = false;
		isApplying = false;
		if (activeTool === 'crop' && typeof Cropper !== 'undefined') {
			initCropper();
		} else if (activeTool === 'crop' && typeof Cropper === 'undefined') {
			loadCropperAssetsIfNeeded().then(() => {
				setTimeout(() => {
					if (activeTool === 'crop' && isImageLoaded && !cropperInstance) {
						initCropper();
					}
				}, 200);
			});
		}
	}
	function handleImageElementError() {
		if (!errorMessage) {
			errorMessage = 'Error: Failed to load image preview.';
		}
		isLoading = false;
		isApplying = false;
		imageUrl = '';
		destroyCropperInternal();
	}

	// --- State Reset Helper ---
	function resetAllState() {
		destroyCropperInternal();
		imageFile = null;
		originalFilename = '';
		imageUUID = null;
		imageUrl = '';
		imageElement = null;
		zoom = 100;
		initialZoomRatio = 1;
		isUpdatingFromSlider = false;
		aspect = NaN;
		aspectRatioLabel = 'Free';
		croppedAreaPixels = null;
		originalDimensions = null;
		targetWidth = '';
		targetHeight = '';
		keepAspectRatio = true;
		isUpdatingProgrammatically = false;
		rotationAngle = 0;
		activeTool = 'crop';
	}

	// --- Change Image ---
	function handleChangeImageClick() {
		if (isLoading || isApplying) return;
		errorMessage = '';
		resetAllState();
		isLoading = false;
		isApplying = false;
		const fileInput = document.getElementById('file-input');
		if (fileInput) {
			fileInput.click();
		}
	}

	// --- Undo / Redo ---
	async function handleUndo() {
		if (!imageUUID || isLoading || isApplying) return;
		isLoading = true;
		isApplying = false;
		const currentActiveTool = activeTool;
		destroyCropperInternal();
		try {
			await undoChanges(imageUUID);
			await fetchInitialDimensions(imageUUID);
			refreshImage();
			activeTool = currentActiveTool;
		} catch (error) {
			errorMessage = `Undo failed: ${error.message || 'Server error'}`;
			isLoading = false;
			if (imageUUID) {
				fetchInitialDimensions(imageUUID).finally(() => {
					refreshImage();
					activeTool = currentActiveTool;
				});
			}
		}
	}
	async function handleRedo() {
		if (!imageUUID || isLoading || isApplying) return;
		isLoading = true;
		isApplying = false;
		const currentActiveTool = activeTool;
		destroyCropperInternal();
		try {
			await redoChanges(imageUUID);
			await fetchInitialDimensions(imageUUID);
			refreshImage();
			activeTool = currentActiveTool;
		} catch (error) {
			errorMessage = `Redo failed: ${error.message || 'Server error'}`;
			isLoading = false;
			if (imageUUID) {
				fetchInitialDimensions(imageUUID).finally(() => {
					refreshImage();
					activeTool = currentActiveTool;
				});
			}
		}
	}

	// --- Download / Open Image ---
	function handleOpenImage() {
		if (!imageUUID || !imageUrl || isLoading || isApplying) return;
		const url = getRenderImage(imageUUID);
		const tsUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
		try {
			const tab = window.open(tsUrl, '_blank');
			if (!tab) {
				errorMessage = 'Could not open image. Check popup blocker.';
			}
		} catch (error) {
			errorMessage = `Error opening image: ${error.message}`;
		}
	}

	// --- CROP TOOL FUNCTIONS ---
	function destroyCropperInternal() {
		if (cropperInstance) {
			try {
				cropperInstance.destroy();
			} catch (e) {
				console.error(e);
			}
			cropperInstance = null;
			croppedAreaPixels = null;
		}
	}
	function initCropper() {
		if (!imageElement || typeof Cropper === 'undefined' || !imageUrl || cropperInstance) {
			isLoading = false;
			isApplying = false;
			return;
		}
		destroyCropperInternal();
		setTimeout(() => {
			if (
				imageElement &&
				typeof Cropper !== 'undefined' &&
				activeTool === 'crop' &&
				!cropperInstance
			) {
				try {
					if (imageElement) imageElement.style.opacity = '0'; // Hide original briefly
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
						modal: true,
						crop: updateCropDataFromEvent,
						zoom: updateSliderFromCropper,
						ready: () => {
							const canvasData = cropperInstance.getCanvasData();
							const imageData = cropperInstance.getImageData();
							initialZoomRatio =
								imageData.naturalWidth > 0
									? canvasData.width / imageData.naturalWidth
									: 1;
							zoom = 100;
							updateCropData();
							isLoading = false;
							isApplying = false;
							if (imageElement) imageElement.style.opacity = '1'; // Show again
						}
					});
					if (!isNaN(aspect)) {
						cropperInstance.setAspectRatio(aspect);
					}
				} catch (err) {
					errorMessage = `Failed to initialize cropper: ${err.message}`;
					destroyCropperInternal();
					isLoading = false;
					isApplying = false;
					if (imageElement) imageElement.style.opacity = '1';
				}
			} else {
				isLoading = false;
				isApplying = false;
				if (imageElement) imageElement.style.opacity = '1';
			}
		}, 100);
	}
	async function handleApplyCrop() {
		if (!cropperInstance || !imageUUID || isLoading || isApplying) {
			errorMessage = 'Crop tool not ready.';
			return;
		}
		const cropData = cropperInstance.getData(true);
		if (!cropData || cropData.width <= 0 || cropData.height <= 0) {
			errorMessage = 'Invalid crop area.';
			return;
		}
		isApplying = true;
		isLoading = true;
		errorMessage = '';
		const currentActiveTool = activeTool;
		try {
			destroyCropperInternal();
			await applyCropFilter(imageUUID, {
				x: cropData.x,
				y: cropData.y,
				width: cropData.width,
				height: cropData.height
			});
			await fetchInitialDimensions(imageUUID);
			refreshImage();
			activeTool = currentActiveTool;
		} catch (error) {
			errorMessage = `Error applying crop: ${error.message}`;
			isApplying = false;
			isLoading = false;
			if (imageUUID) {
				fetchInitialDimensions(imageUUID).finally(() => {
					refreshImage();
					activeTool = currentActiveTool;
				});
			}
		}
	}
	function updateAspectRatio(newAspect, label) {
		if (isLoading || isApplying) return;
		aspect = newAspect;
		aspectRatioLabel = label;
		if (cropperInstance) {
			cropperInstance.setAspectRatio(newAspect);
		}
		updateCropData();
	}
	function updateZoomFromSlider(event) {
		if (!cropperInstance || !initialZoomRatio || !imageElement || isLoading || isApplying)
			return;
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
			console.warn('Zoom error:', e);
		} finally {
			tick().then(() => {
				isUpdatingFromSlider = false;
			});
		}
	}
	function updateSliderFromCropper(event) {
		if (
			!cropperInstance ||
			!initialZoomRatio ||
			isUpdatingFromSlider ||
			!imageElement ||
			isLoading ||
			isApplying
		) {
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
		const minZoom = 1;
		const maxZoom = 500;
		const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newSliderValue));
		if (zoom !== clampedZoom) {
			zoom = clampedZoom;
		}
	}
	function updateCropDataFromEvent(event) {
		if (cropperInstance && !isLoading && !isApplying) {
			updateCroppedAreaPixels(cropperInstance.getData(true));
		}
	}
	function updateCropData() {
		if (cropperInstance && !isLoading && !isApplying) {
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
		} else if (!cropperInstance) {
			croppedAreaPixels = null;
		}
	}

	// --- RESIZE TOOL FUNCTIONS ---
	async function handleApplyResize() {
		if (!originalDimensions || !imageUUID || isLoading || isApplying) {
			errorMessage = 'Resize tool not ready.';
			return;
		}
		const widthNum = Number(targetWidth);
		const heightNum = Number(targetHeight);
		if (isNaN(widthNum) || isNaN(heightNum) || widthNum <= 0 || heightNum <= 0) {
			errorMessage = 'Invalid dimensions.';
			return;
		}
		if (widthNum > MAX_DIMENSION || heightNum > MAX_DIMENSION) {
			errorMessage = `Dimensions cannot exceed ${MAX_DIMENSION}px.`;
			return;
		}
		isApplying = true;
		isLoading = true;
		errorMessage = '';
		const currentActiveTool = activeTool;
		destroyCropperInternal();
		try {
			await applyResizeFilter(imageUUID, widthNum, heightNum);
			await fetchInitialDimensions(imageUUID);
			refreshImage();
			activeTool = currentActiveTool;
		} catch (error) {
			errorMessage = `Error applying resize: ${error.message}`;
			isApplying = false;
			isLoading = false;
			if (imageUUID) {
				fetchInitialDimensions(imageUUID).finally(() => {
					refreshImage();
					activeTool = currentActiveTool;
				});
			}
		}
	}
	function updateHeightFromWidth() {
		if (
			isUpdatingProgrammatically ||
			!keepAspectRatio ||
			!originalDimensions ||
			typeof targetWidth !== 'number' ||
			targetWidth <= 0 ||
			isLoading ||
			isApplying
		)
			return;
		isUpdatingProgrammatically = true;
		let newWidth = Math.max(1, Math.min(targetWidth, MAX_DIMENSION));
		if (newWidth !== targetWidth) targetWidth = newWidth;
		const aspectRatio = originalDimensions.width / originalDimensions.height;
		if (isNaN(aspectRatio) || aspectRatio <= 0 || originalDimensions.height === 0) {
			isUpdatingProgrammatically = false;
			return;
		}
		const newHeight = Math.round(newWidth / aspectRatio);
		const finalHeight = Math.max(1, Math.min(newHeight, MAX_DIMENSION));
		if (targetHeight !== finalHeight) targetHeight = finalHeight;
		tick().then(() => (isUpdatingProgrammatically = false));
	}
	function updateWidthFromHeight() {
		if (
			isUpdatingProgrammatically ||
			!keepAspectRatio ||
			!originalDimensions ||
			typeof targetHeight !== 'number' ||
			targetHeight <= 0 ||
			isLoading ||
			isApplying
		)
			return;
		isUpdatingProgrammatically = true;
		let newHeight = Math.max(1, Math.min(targetHeight, MAX_DIMENSION));
		if (newHeight !== targetHeight) targetHeight = newHeight;
		const aspectRatio = originalDimensions.width / originalDimensions.height;
		if (isNaN(aspectRatio) || aspectRatio <= 0) {
			isUpdatingProgrammatically = false;
			return;
		}
		const newWidth = Math.round(newHeight * aspectRatio);
		const finalWidth = Math.max(1, Math.min(newWidth, MAX_DIMENSION));
		if (targetWidth !== finalWidth) targetWidth = finalWidth;
		tick().then(() => (isUpdatingProgrammatically = false));
	}

	// --- ROTATE TOOL FUNCTIONS ---
	async function handleApplyRotate() {
		if (!imageUUID || isLoading || isApplying) {
			errorMessage = 'Rotate tool not ready.';
			return;
		}
		const angleNum = Number(rotationAngle);
		if (isNaN(angleNum)) {
			errorMessage = 'Invalid rotation angle.';
			return;
		}
		isApplying = true;
		isLoading = true;
		errorMessage = '';
		const currentActiveTool = activeTool;
		destroyCropperInternal();
		try {
			await applyRotateFilter(imageUUID, angleNum);
			await fetchInitialDimensions(imageUUID);
			refreshImage();
			activeTool = currentActiveTool;
		} catch (error) {
			errorMessage = `Error applying rotation: ${error.message}`;
			isApplying = false;
			isLoading = false;
			if (imageUUID) {
				fetchInitialDimensions(imageUUID).finally(() => {
					refreshImage();
					activeTool = currentActiveTool;
				});
			}
		}
	}
	function setRotation(angle) {
		if (isLoading || isApplying) return;
		rotationAngle = angle;
	}

	// --- Helper ---
	function truncateFilename(name, length = 25) {
		if (!name) return '';
		if (name.length <= length) return name;
		const extIndex = name.lastIndexOf('.');
		const ext = extIndex !== -1 ? name.substring(extIndex) : '';
		const base = extIndex !== -1 ? name.substring(0, extIndex) : name;
		const maxBaseLength = length - ext.length - 3;
		if (maxBaseLength <= 0) return name.substring(0, length - 3) + '...';
		const truncatedBase = base.length > maxBaseLength ? base.substring(0, maxBaseLength) : base;
		return `${truncatedBase}...${ext}`;
	}

	// --- Reactive UI States ---
	$: isImageLoaded = !!imageUUID && !!imageUrl;
	$: canUseTools = isImageLoaded && !isLoading && !isApplying;
	$: canChange = !isLoading && !isApplying;
	$: canUndo = isImageLoaded && !isLoading && !isApplying;
	$: canRedo = isImageLoaded && !isLoading && !isApplying;
	$: canOpen = isImageLoaded && !isLoading && !isApplying;
	$: canApplyCrop =
		canUseTools &&
		activeTool === 'crop' &&
		!!cropperInstance &&
		!!croppedAreaPixels &&
		croppedAreaPixels.width > 0 &&
		croppedAreaPixels.height > 0;
	$: canApplyResize =
		canUseTools &&
		activeTool === 'resize' &&
		!!originalDimensions &&
		typeof targetWidth === 'number' &&
		targetWidth > 0 &&
		targetWidth <= MAX_DIMENSION &&
		typeof targetHeight === 'number' &&
		targetHeight > 0 &&
		targetHeight <= MAX_DIMENSION;
	$: canApplyRotate = canUseTools && activeTool === 'rotate' && typeof rotationAngle === 'number';
</script>

<svelte:head>
	<title>Image Editor - Slurp Tools</title>
</svelte:head>

<div class="editor-wrapper">
	<div class="page-container">
		{#if !imageUUID && !isLoading}
			<!-- Initial State -->
			<div class="initial-upload-state" transition:fade={{ duration: 200 }}>
				<h1>All-in-One Image Editor</h1>
				<p class="tool-description">
					Upload an image to start cropping, resizing, and rotating.
				</p>
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
		{:else if isLoading && (!imageUrl || !originalDimensions) && !isApplying}
			<!-- Loading State -->
			<div class="loading-state" transition:fade={{ duration: 200 }}>
				<div class="spinner"></div>
				{#if originalFilename && !imageUUID}
					<p>Uploading {truncateFilename(originalFilename, 30)}...</p>
				{:else if imageUUID && (!originalDimensions || !imageUrl)}
					<p>Loading image details & preview...</p>
				{:else}
					<p>Loading...</p>
				{/if}
				{#if errorMessage}<p class="error-message">{errorMessage}</p>{/if}
			</div>
		{:else}
			<!-- Editor Interface -->
			<div
				class="editor-interface"
				class:loading={isLoading || isApplying}
				transition:fade={{ duration: 300 }}
			>
				<!-- Toolbar -->
				<div class="top-toolbar">
					<div class="tool-switcher">
						<button
							class:active={activeTool === 'crop'}
							on:click={() => setActiveTool('crop')}
							disabled={isLoading || isApplying}>Crop</button
						>
						<button
							class:active={activeTool === 'resize'}
							on:click={() => setActiveTool('resize')}
							disabled={isLoading || isApplying}>Resize</button
						>
						<button
							class:active={activeTool === 'rotate'}
							on:click={() => setActiveTool('rotate')}
							disabled={isLoading || isApplying}>Rotate</button
						>
					</div>
					<div class="toolbar-right"></div>
				</div>
				<!-- Main Area -->
				<div class="main-area">
					{#if imageUrl}
						<div class="img-preview-container">
							<img
								bind:this={imageElement}
								src={imageUrl}
								alt={originalFilename || 'Image to edit'}
								class="preview-image"
								on:load={handleImageElementLoad}
								on:error={handleImageElementError}
								key={imageUrl}
								crossorigin="anonymous"
								style="opacity: {activeTool === 'crop' && !cropperInstance
									? 0
									: 1};"
							/>
						</div>
					{/if}
					{#if (isLoading || isApplying) && isImageLoaded}
						<div class="main-area-overlay">
							<div class="spinner"></div>
							<p>{isApplying ? 'Applying Changes...' : 'Loading...'}</p>
						</div>
					{/if}
					{#if !imageUrl && !isLoading && imageUUID}
						<p class="placeholder-text error-message">Failed to load image preview.</p>
					{/if}
				</div>
				<!-- Sidebar -->
				<div class="right-sidebar">
					<!-- File Management -->
					{#if isImageLoaded || isLoading || isApplying}
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
					{/if}
					<!-- Tool Specific Controls -->
					{#if isImageLoaded}
						<!-- Crop Controls -->
						{#if activeTool === 'crop'}
							<div
								class="sidebar-section crop-controls"
								transition:fade={{ duration: 150 }}
							>
								<h4 class="h4-blue">Crop Options</h4>
								<div class="control-item">
									<span class="control-label">Aspect Ratio</span>
									<div class="aspect-ratio-controls">
										<button
											class:active={aspectRatioLabel === 'Free'}
											on:click={() => updateAspectRatio(NaN, 'Free')}
											disabled={!canUseTools || !cropperInstance}>Free</button
										>
										<button
											class:active={aspectRatioLabel === '1:1'}
											on:click={() => updateAspectRatio(1, '1:1')}
											disabled={!canUseTools || !cropperInstance}>1:1</button
										>
										<button
											class:active={aspectRatioLabel === '4:3'}
											on:click={() => updateAspectRatio(4 / 3, '4:3')}
											disabled={!canUseTools || !cropperInstance}>4:3</button
										>
										<button
											class:active={aspectRatioLabel === '16:9'}
											on:click={() => updateAspectRatio(16 / 9, '16:9')}
											disabled={!canUseTools || !cropperInstance}>16:9</button
										>
									</div>
								</div>
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
										disabled={!canUseTools || !cropperInstance}
									/> <span class="zoom-value">{zoom}%</span>
								</div>
								{#if croppedAreaPixels}
									<div class="control-item details">
										<span class="control-label">Selection (px)</span>
										<div class="details-grid">
											<span>W:</span> <span>{croppedAreaPixels.width}</span>
											<span>H:</span> <span>{croppedAreaPixels.height}</span>
											<span>X:</span> <span>{croppedAreaPixels.x}</span>
											<span>Y:</span> <span>{croppedAreaPixels.y}</span>
										</div>
									</div>
								{:else}
									<div class="control-item details">
										<span class="control-label">Selection (px)</span>
										<p class="placeholder-text-small">Initializing...</p>
									</div>
								{/if}
								<button
									class="button-like apply-button apply-crop"
									on:click={handleApplyCrop}
									disabled={!canApplyCrop}
								>
									{#if isApplying && activeTool === 'crop'}<span
											class="button-spinner"
										></span> Applying...{:else}Apply Crop{/if}
								</button>
							</div>
						{/if}
						<!-- Resize Controls -->
						{#if activeTool === 'resize'}
							<div
								class="sidebar-section resize-controls"
								transition:fade={{ duration: 150 }}
							>
								<h4 class="h4-pink">Resize Options</h4>
								{#if originalDimensions}
									<p class="original-dims-info">
										Current: {originalDimensions.width} x {originalDimensions.height}
										px
									</p>
									<div class="dimension-inputs">
										<div class="input-group">
											<label for="width">Width (px)</label>
											<input
												type="number"
												id="width"
												bind:value={targetWidth}
												min="1"
												max={MAX_DIMENSION}
												disabled={!canUseTools}
												on:input={updateHeightFromWidth}
												placeholder="Width"
											/>
										</div>
										<div class="input-group">
											<label for="height">Height (px)</label>
											<input
												type="number"
												id="height"
												bind:value={targetHeight}
												min="1"
												max={MAX_DIMENSION}
												disabled={!canUseTools}
												on:input={updateWidthFromHeight}
												placeholder="Height"
											/>
										</div>
									</div>
									<div class="aspect-toggle">
										<label>
											<input
												type="checkbox"
												bind:checked={keepAspectRatio}
												disabled={!canUseTools || !originalDimensions}
												on:change={() => {
													if (keepAspectRatio) updateHeightFromWidth();
												}}
											/> <span>Lock aspect ratio</span>
										</label>
									</div>
								{:else}
									<p class="placeholder-text">Loading dimensions...</p>
								{/if}
								<button
									class="button-like apply-button apply-resize"
									on:click={handleApplyResize}
									disabled={!canApplyResize}
								>
									{#if isApplying && activeTool === 'resize'}<span
											class="button-spinner"
										></span> Applying...{:else}Apply Resize{/if}
								</button>
							</div>
						{/if}
						<!-- Rotate Controls -->
						{#if activeTool === 'rotate'}
							<div
								class="sidebar-section rotate-controls"
								transition:fade={{ duration: 150 }}
							>
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
											bind:value={rotationAngle}
											class="rotation-slider"
											disabled={!canUseTools}
										/> <span class="rotation-value">{rotationAngle}°</span>
									</div>
								</div>
								<div class="control-item quick-rotate-buttons">
									<button
										class="button-like quick-button"
										on:click={() => setRotation(-90)}
										disabled={!canUseTools}>-90°</button
									>
									<button
										class="button-like quick-button"
										on:click={() => setRotation(0)}
										disabled={!canUseTools}>0°</button
									>
									<button
										class="button-like quick-button"
										on:click={() => setRotation(90)}
										disabled={!canUseTools}>+90°</button
									>
									<button
										class="button-like quick-button"
										on:click={() => setRotation(180)}
										disabled={!canUseTools}>180°</button
									>
								</div>
								<button
									class="button-like apply-button apply-rotate"
									on:click={handleApplyRotate}
									disabled={!canApplyRotate}
								>
									{#if isApplying && activeTool === 'rotate'}<span
											class="button-spinner"
										></span> Applying...{:else}Apply Rotation{/if}
								</button>
							</div>
						{/if}
					{/if}
					<!-- History Controls -->
					{#if isImageLoaded || isLoading || isApplying}
						<div class="sidebar-section history-controls-section">
							<h4 class="h4-teal">History</h4>
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
										><path
											fill-rule="evenodd"
											d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"
										/><path
											d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"
										/></svg
									> <span>Undo</span>
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
										><path
											fill-rule="evenodd"
											d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
										/><path
											d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36-1.966a.25.25 0 0 1 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"
										/></svg
									> <span>Redo</span>
								</button>
							</div>
						</div>
					{/if}
					<!-- Download Button -->
					{#if isImageLoaded}
						<div class="sidebar-section download-section">
							<button
								on:click={handleOpenImage}
								class="button-like save-button"
								disabled={!canOpen}>Download Image</button
							>
						</div>
					{/if}
					<!-- Error Message Area -->
					{#if errorMessage}
						<p class="error-message sidebar-error" transition:fade={{ duration: 150 }}>
							{errorMessage}
						</p>
					{/if}
				</div>
				<!-- End Sidebar -->
			</div>
			<!-- End Editor Interface -->
		{/if}
		<input
			type="file"
			id="file-input"
			accept="image/png, image/jpeg, image/webp, image/gif"
			on:change={handleFileSelect}
			style="display: none;"
		/>
	</div>
	<!-- End Page Container -->
</div>

<!-- End Editor Wrapper -->

<style>
	/* --- Base & Layout Variables --- */
	:root {
		--toolbar-height: 60px;
		--sidebar-width: 300px;
		--grid-size: 20px;
		--editor-v-margin: 3rem;
		--editor-fixed-height: calc(90vh - var(--editor-v-margin) - 1px);
		--active-tool-color: var(--blue); /* Accent color for active tool */
	}
	:global(html, body) {
		height: 100%;
		margin: 0;
		padding: 0;
	}
	:global(.cropper-modal) {
		background-color: rgba(0, 0, 0, 0.65);
	}
	:global(.cropper-view-box) {
		outline-color: var(--blue);
	}
	:global(.cropper-line),
	:global(.cropper-point) {
		background-color: var(--blue);
	}

	/* --- Component Structure --- */
	.editor-wrapper {
		max-width: 1400px;
		margin: calc(var(--editor-v-margin) / 2) auto;
		padding: 0 1rem;
		box-sizing: border-box;
		display: flex;
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

	/* --- Initial/Loading States --- */
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
		height: 100%;
		min-height: 400px;
	}
	.tool-description {
		margin-bottom: 1.5rem;
		color: var(--base);
		max-width: 450px;
		line-height: 1.5;
	} /* Using subtext0 (darker grey on light bg) */
	.loading-state p {
		margin-top: 1rem;
		color: var(--overlay);
	} /* Overlay likely dark */

	/* --- Editor Layout --- */
	.editor-interface {
		display: grid;
		grid-template-areas: 'toolbar toolbar' 'main sidebar';
		grid-template-rows: var(--toolbar-height) 1fr;
		grid-template-columns: 1fr var(--sidebar-width);
		flex-grow: 1;
		overflow: hidden;
		background-color: var(--base);
		min-height: 0;
		height: 100%;
		position: relative;
	}

	/* --- Toolbar --- */
	/* Toolbar BG is --mantle (dark) */
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
	.tool-switcher {
		display: flex;
		align-items: center;
		background-color: var(--base);
		border-radius: 8px;
		overflow: hidden;
		border: 2px solid var(--base);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	.tool-switcher button {
		background-color: var(--crust); /* Light BG for buttons */
		border: none;
		border-right: 1px solid var(--crust); /* Darker border */
		color: var(--base); /* Darker grey text on light bg */
		padding: 0.6rem 1.2rem;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 500;
		line-height: 1;
	}
	.tool-switcher button:last-child {
		border-right: none;
	}
	.tool-switcher button:hover:not(:disabled) {
		background-color: var(--surface0); /* Darker hover BG */
		color: var(--surface0); /* Light text */
	}
	.tool-switcher button.active {
		background-color: var(--active-tool-color); /* Accent BG */
		color: var(--base); /* Light Text */
		font-weight: 700;
	}
	.tool-switcher button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background-color: var(--base) !important;
		color: var(--overlay) !important;
	}
	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	/* --- Main Area --- */
	/* Main BG is --surface0 (darkish) */
	.main-area {
		grid-area: main;
		overflow: hidden;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1.5rem;
		box-sizing: border-box;
		background-color: var(--surface0);
		background-image:
			repeating-linear-gradient(var(--overlay) 0 1px, transparent 1px var(--grid-size)),
			repeating-linear-gradient(90deg, var(--overlay) 0 1px, transparent 1px var(--grid-size));
		background-size: var(--grid-size) var(--grid-size);
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
	.main-area-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(var(--base-rgb), 0.85);
		backdrop-filter: blur(3px);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		z-index: 15;
		color: var(--text);
		text-align: center;
	} /* Dark text on light overlay */
	.main-area-overlay p {
		margin-top: 1rem;
		font-weight: 500;
	}

	/* --- Right Sidebar --- */
	/* Sidebar BG is --base (light) */
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
	/* Section BG is --mantle (dark) */
	.sidebar-section {
		border-radius: 8px;
		padding: 1rem 1.2rem;
		border: 1px solid var(--surface1);
		background-color: var(--mantle);
	}
	.sidebar-section h4 {
		font-family: var(--font-header);
		margin: 0 0 1rem 0;
		font-size: 0.9rem;
		font-weight: 600;
		padding-bottom: 0.6rem;
		color: var(--base); /* Light text on dark section BG */
		border-bottom: 1px solid var(--surface2); /* Keep border subtle */
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	/* Keep accent color for border, text is light */
	.h4-mauve {
		border-bottom-color: var(--mauve) !important;
	}
	.h4-blue {
		border-bottom-color: var(--blue) !important;
	}
	.h4-pink {
		border-bottom-color: var(--pink) !important;
	}
	.h4-maroon {
		border-bottom-color: var(--maroon) !important;
	}
	.h4-teal {
		border-bottom-color: var(--teal) !important;
	}

	/* Filename BG is --crust (dark) */
	.sidebar-section.file-management .filename {
		font-size: 0.85rem;
		margin-bottom: 1rem;
		background-color: var(--crust);
		color: var(--base); /* Light text on dark BG */
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: normal;
		word-break: break-all;
		border: 1px solid var(--surface0);
		line-height: 1.4;
	}
	.sidebar-section.download-section {
		padding: 0;
		border: none;
		background: none;
		margin-top: -0.5rem;
	}
	.placeholder-text {
		font-size: 0.9rem;
		color: var(--base);
		text-align: center;
		padding: 1rem 0;
	} /* Light grey on dark section BG */
	.placeholder-text-small {
		font-size: 0.8rem;
		color: var(--base);
		text-align: center;
		padding: 0.5rem 0;
		margin: 0;
	} /* Lighter grey on dark section BG */

	/* --- General Button Styles --- */
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
		transition: all 0.2s ease;
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
		box-shadow: none;
		filter: grayscale(50%);
		transform: none !important;
	}
	.button-like:not(:disabled):hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
		filter: brightness(1.12);
	}
	.button-like:not(:disabled):active {
		transform: translateY(0px);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		filter: brightness(0.95);
	}

	/* --- Specific Button Styles (Color Contrast Fixes) --- */
	.initial-upload-state .file-label {
		border: 2px dashed var(--overlay);
		background-color: var(--mantle); /* Dark BG */
		color: var(--base); /* Light Text */
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
	} /* Keep accent color */
	.apply-button {
		color: var(--base); /* Light text on colored BG */
		margin-top: 1rem;
	}
	.apply-button.apply-crop {
		background-color: var(--blue);
	}
	.apply-button.apply-resize {
		background-color: var(--pink);
	}
	.apply-button.apply-rotate {
		background-color: var(--maroon);
	}
	.change-button {
		background-color: var(--crust); /* Dark BG */
		color: var(--base); /* Light text */
		border: 1px solid var(--surface0);
		padding: 0.6rem 1rem;
		font-size: 0.9rem;
		box-shadow: none;
	}
	.change-button:hover:not(:disabled) {
		background-color: var(--surface0);
		color: var(--lavender);
		border-color: var(--surface1);
		filter: brightness(1.1);
	}
	.save-button {
		background-color: var(--sky); /* Sky blue BG */
		color: var(--text); /* Light text */
	}
	.history-button {
		flex: 1;
		padding: 0.5rem 0.8rem;
		font-size: 0.85rem;
		background-color: var(--crust); /* Dark BG */
		color: var(--base); /* Light text */
		border: 1px solid var(--surface0);
		box-shadow: none;
		gap: 0.4rem;
		width: auto;
	}
	.history-button svg {
		width: 1em;
		height: 1em;
	}
	.history-button:hover:not(:disabled) {
		background-color: var(--surface0);
		filter: brightness(1.15);
	}
	.history-button:disabled {
		opacity: 0.5;
		filter: grayscale(80%);
		cursor: not-allowed;
	}

	/* --- Sidebar Controls Common --- */
	.control-item {
		margin-bottom: 1.2rem;
	}
	.control-item:last-child {
		margin-bottom: 0;
	}
	.control-label {
		display: block;
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
		color: var(--base);
		font-weight: 500;
	} /* Light grey text on dark section BG */
	.control-item label {
		display: block;
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
		color: var(--base);
		font-weight: 500;
		cursor: pointer;
	} /* Light grey text on dark section BG */
	.history-controls-section .history-controls {
		display: flex;
		gap: 0.8rem;
		justify-content: space-between;
	}

	/* --- Crop Controls (on dark --mantle BG) --- */
	.aspect-ratio-controls {
		display: flex;
		background-color: var(--base);
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid var(--base);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}
	.aspect-ratio-controls button {
		background-color: var(--crust); /* Light BG */
		border: none;
		border-left: 1px solid var(--surface2); /* Darker border */
		color: var(--base); /* Darker grey text */
		padding: 0.5rem 0.9rem;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 500;
		flex: 1;
		text-align: center;
	}
	.aspect-ratio-controls button:first-child {
		border-left: none;
	}
	.aspect-ratio-controls button:hover:not(:disabled) {
		background-color: var(--surface0); /* Darker hover BG */
		color: var(--crust); /* Light text */
	}
	.aspect-ratio-controls button.active {
		background-color: var(--blue); /* Accent BG */
		color: var(--base); /* Light text */
		font-weight: 700;
	}
	.aspect-ratio-controls button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background-color: var(--base) !important;
		color: var(--overlay) !important;
		filter: grayscale(80%);
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
		accent-color: var(--blue);
		background: var(--overlay);
		border-radius: 4px;
		margin: 0;
		min-width: 80px;
		transition: box-shadow 0.2s ease;
	}
	.zoom-slider:hover:not(:disabled) {
		box-shadow: 0 0 5px color-mix(in srgb, var(--blue) 50%, transparent);
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
		color: var(--base);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
	} /* Light text */
	.details {
	}
	.details-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.3rem 0.8rem;
		font-size: 0.8rem;
		font-family: var(--font-mono);
	}
	.details-grid span:nth-child(odd) {
		color: var(--base);
		opacity: 0.85;
		text-align: right;
		white-space: nowrap;
		font-weight: 500;
	} /* Lighter grey text */
	.details-grid span:nth-child(even) {
		color: var(--base); /* Light text */
		font-weight: 600;
		background: var(--surface0); /* Dark BG */
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		text-align: left;
	}

	/* --- Resize Controls (on dark --mantle BG) --- */
	.original-dims-info {
		font-size: 0.8rem;
		color: var(--base);
		margin-bottom: 0.8rem;
		text-align: center;
		background: var(--surface0);
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
	} /* Lighter grey text on dark BG */
	.dimension-inputs {
		display: flex;
		gap: 0.8rem;
		margin-bottom: 1rem;
	}
	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		flex: 1;
	}
	.input-group label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--base);
		opacity: 0.9;
	} /* Light text */
	.input-group input[type='number'] {
		width: 100%;
		padding: 0.5rem 0.8rem;
		border: 1px solid var(--overlay);
		border-radius: 6px;
		font-size: 0.9rem;
		background-color: var(--base);
		color: var(--text);
		box-sizing: border-box;
		appearance: textfield;
	} /* Light BG, Dark text */
	.input-group input[type='number']::-webkit-outer-spin-button,
	.input-group input[type='number']::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.input-group input:focus {
		outline: none;
		border-color: var(--pink);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--pink) 30%, transparent);
	}
	.aspect-toggle {
		margin-bottom: 0;
	}
	.aspect-toggle label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		cursor: pointer;
		color: var(--base);
	} /* Light text */
	.aspect-toggle input[type='checkbox'] {
		accent-color: var(--pink);
		cursor: pointer;
	}
	.aspect-toggle input[type='checkbox']:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	/* --- Rotate Controls (on dark --mantle BG) --- */
	.rotation-slider-group .slider-container {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.rotation-slider {
		flex-grow: 1;
		height: 8px;
		cursor: pointer;
		accent-color: var(--maroon);
		background: var(--overlay);
		border-radius: 4px;
		margin: 0;
		min-width: 80px;
		transition: box-shadow 0.2s ease;
	}
	.rotation-slider:hover:not(:disabled) {
		box-shadow: 0 0 5px color-mix(in srgb, var(--maroon) 50%, transparent);
	}
	.rotation-slider:disabled {
		cursor: not-allowed;
		opacity: 0.5;
		box-shadow: none;
		accent-color: var(--overlay);
	}
	.rotation-value {
		font-size: 0.9rem;
		min-width: 45px;
		text-align: right;
		color: var(--base);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
	} /* Light text */
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
		background-color: var(--crust); /* Dark BG */
		color: var(--base); /* Light text */
		border: 1px solid var(--surface0);
		box-shadow: none;
	}
	.quick-button:hover:not(:disabled) {
		background-color: var(--surface0);
		filter: brightness(1.15);
	}
	.quick-button:disabled {
		opacity: 0.5;
		filter: grayscale(80%);
		cursor: not-allowed;
	}

	/* --- Loading/Spinners --- */
	.spinner {
		border: 4px solid var(--overlay);
		border-top: 4px solid var(--blue);
		border-radius: 50%;
		width: 40px;
		height: 40px;
		animation: spin 1s linear infinite;
	}
	.button-spinner {
		border: 2px solid color-mix(in srgb, var(--base) 50%, transparent);
		border-top: 2px solid var(--base);
		border-radius: 50%;
		width: 1em;
		height: 1em;
		animation: spin 0.8s linear infinite;
		display: inline-block;
		vertical-align: middle;
		margin-right: 0.5em;
	} /* Spinner for light text buttons */
	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* --- Error Message --- */
	/* Error on light BG */
	.error-message {
		background-color: color-mix(in srgb, var(--red) 15%, transparent);
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
	/* Error within dark sidebar section */
	.sidebar-error {
		margin: 0;
		width: 100%;
		box-sizing: border-box;
		text-align: left;
		margin-top: 1rem;
		background-color: color-mix(in srgb, var(--red) 20%, transparent);
		color: var(--red);
		border-color: var(--red);
	} /* Keep red text for error emphasis */

	/* --- Responsive Design --- */
	@media (max-width: 900px) {
		/* Styles as before */
	}
	@media (max-width: 480px) {
		/* Styles as before */
	}
</style>
