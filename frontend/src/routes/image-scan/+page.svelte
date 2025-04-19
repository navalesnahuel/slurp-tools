<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';

	import * as imageApi from '$lib/services/imageApi.js';

	let imageFile = null;
	let originalFilename = '';
	let imageUUID = null;
	let imageInfo = null;
	let imageUrl = '';
	let currentBlobUrl = null;
	let isLoading = false;
	let isGeneratingPdf = false;
	let loadingStep = '';
	let errorMessage = '';

	let imageRef = null;
	let canvasRef = null;
	let ctx = null;
	let originalDimensions = null;
	let naturalWidth = 0;
	let naturalHeight = 0;
	let displayWidth = 0;
	let displayHeight = 0;

	const HANDLE_RADIUS = 8;
	let handles = [
		{ x: 0.05, y: 0.05 },
		{ x: 0.95, y: 0.05 },
		{ x: 0.95, y: 0.95 },
		{ x: 0.05, y: 0.95 }
	];
	let activeHandleIndex = -1;
	let showHandles = false;

	let resizeObserver = null;

	function setupResizeObserver() {
		if (!browser) return;
		resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				if (
					entry.target === imageRef &&
					canvasRef &&
					canvasRef.parentElement &&
					showHandles
				) {
					const imgRect = imageRef.getBoundingClientRect();
					const newWidth = imgRect.width;
					const newHeight = imgRect.height;
					const wrapperRect = canvasRef.parentElement.getBoundingClientRect();
					const sizeChanged = newWidth !== displayWidth || newHeight !== displayHeight;

					if (newWidth > 0 && newHeight > 0) {
						const offsetX = imgRect.left - wrapperRect.left;
						const offsetY = imgRect.top - wrapperRect.top;

						canvasRef.style.left = `${offsetX}px`;
						canvasRef.style.top = `${offsetY}px`;

						if (sizeChanged) {
							displayWidth = newWidth;
							displayHeight = newHeight;
							canvasRef.width = displayWidth;
							canvasRef.height = displayHeight;

							requestAnimationFrame(drawCanvas);
						}
					} else {
						if (displayWidth > 0 || displayHeight > 0) {
							canvasRef.style.left = `0px`;
							canvasRef.style.top = `0px`;
							canvasRef.width = 0;
							canvasRef.height = 0;
							displayWidth = 0;
							displayHeight = 0;
							if (ctx) ctx.clearRect(0, 0, 0, 0);
						}
					}
				}
			}
		});
	}

	function observeImageResize(imageElement) {
		if (resizeObserver && imageElement) {
			resizeObserver.observe(imageElement);
		}
	}

	function stopObservingImageResize() {
		if (resizeObserver && imageRef) {
			try {
				resizeObserver.unobserve(imageRef);
			} catch (e) {}
		}
	}

	function cleanupBlobUrl() {
		if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) {
			URL.revokeObjectURL(currentBlobUrl);
			currentBlobUrl = null;
		}
	}

	function handleFileSelect(event) {
		const fileInput = event.target;
		const file = fileInput.files?.[0];
		if (file && browser) {
			stopObservingImageResize();
			cleanupBlobUrl();

			imageFile = file;
			imageUUID = null;
			imageInfo = null;
			originalFilename = file.name;
			errorMessage = '';
			isLoading = false;
			isGeneratingPdf = false;
			loadingStep = 'Loading image...';
			handles = [
				{ x: 0.05, y: 0.05 },
				{ x: 0.95, y: 0.05 },
				{ x: 0.95, y: 0.95 },
				{ x: 0.05, y: 0.95 }
			];
			showHandles = true;
			originalDimensions = null;
			naturalWidth = 0;
			naturalHeight = 0;
			displayWidth = 0;
			displayHeight = 0;
			if (ctx && canvasRef) {
				ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
				canvasRef.width = 0;
				canvasRef.height = 0;
			}

			imageUrl = URL.createObjectURL(file);
			currentBlobUrl = imageUrl;

			fileInput.value = null;
		} else {
			if (fileInput) fileInput.value = null;
		}
	}

	function drawCanvas() {
		if (
			!canvasRef ||
			!imageRef ||
			!ctx ||
			!showHandles ||
			displayWidth <= 0 ||
			displayHeight <= 0 ||
			!browser
		) {
			if (ctx && canvasRef) ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
			return;
		}

		ctx.clearRect(0, 0, displayWidth, displayHeight);

		ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(handles[0].x * displayWidth, handles[0].y * displayHeight);
		for (let i = 1; i < handles.length; i++) {
			ctx.lineTo(handles[i].x * displayWidth, handles[i].y * displayHeight);
		}
		ctx.closePath();
		ctx.stroke();

		ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
		ctx.lineWidth = 1;
		handles.forEach((handle, index) => {
			ctx.beginPath();
			ctx.arc(
				handle.x * displayWidth,
				handle.y * displayHeight,
				HANDLE_RADIUS,
				0,
				Math.PI * 2
			);
			ctx.fill();
			ctx.stroke();
		});
	}

	function getEventPos(event) {
		if (!canvasRef) return { x: 0, y: 0 };
		const rect = canvasRef.getBoundingClientRect();
		const clientX = event.touches ? event.touches[0].clientX : event.clientX;
		const clientY = event.touches ? event.touches[0].clientY : event.clientY;
		return { x: clientX - rect.left, y: clientY - rect.top };
	}

	$: isBusy = isLoading || isGeneratingPdf;

	function handleMouseDown(event) {
		event.preventDefault();
		if (
			!showHandles ||
			isBusy ||
			!browser ||
			displayWidth <= 0 ||
			displayHeight <= 0 ||
			!canvasRef
		)
			return;

		const pos = getEventPos(event);
		const hitRadiusSquared = (HANDLE_RADIUS * 1.8) ** 2;

		for (let i = 0; i < handles.length; i++) {
			const handleX = handles[i].x * displayWidth;
			const handleY = handles[i].y * displayHeight;
			const dx = pos.x - handleX;
			const dy = pos.y - handleY;
			if (dx * dx + dy * dy < hitRadiusSquared) {
				activeHandleIndex = i;
				canvasRef.style.cursor = 'grabbing';
				return;
			}
		}
		activeHandleIndex = -1;
	}

	function handleMouseMove(event) {
		event.preventDefault();
		if (
			activeHandleIndex === -1 ||
			isBusy ||
			!canvasRef ||
			!browser ||
			displayWidth <= 0 ||
			displayHeight <= 0
		)
			return;

		const pos = getEventPos(event);

		let newX = Math.max(0, Math.min(1, pos.x / displayWidth));
		let newY = Math.max(0, Math.min(1, pos.y / displayHeight));

		handles[activeHandleIndex].x = newX;
		handles[activeHandleIndex].y = newY;

		requestAnimationFrame(drawCanvas);
	}

	function handleMouseUp(event) {
		event.preventDefault();
		if (activeHandleIndex !== -1) {
			activeHandleIndex = -1;
			if (canvasRef && showHandles && !isBusy) canvasRef.style.cursor = 'grab';
		}
	}

	function handleMouseEnterCanvas() {
		if (showHandles && !isBusy && canvasRef && activeHandleIndex === -1) {
			canvasRef.style.cursor = 'grab';
		}
	}

	function handleMouseLeaveCanvas() {
		if (activeHandleIndex === -1 && !isBusy && canvasRef) {
			canvasRef.style.cursor = 'default';
		}
	}

	function handleImageLoad() {
		if (!imageRef || !browser) {
			return;
		}

		naturalWidth = imageRef.naturalWidth;
		naturalHeight = imageRef.naturalHeight;
		originalDimensions = { width: naturalWidth, height: naturalHeight };

		if (
			!isGeneratingPdf &&
			(loadingStep === 'Loading image...' || loadingStep === 'Loading new version...')
		) {
			isLoading = false;
			loadingStep = '';
		} else if (!isGeneratingPdf && isLoading) {
			isLoading = false;
			loadingStep = '';
		}

		if (!ctx && canvasRef) {
			ctx = canvasRef.getContext('2d');
		}

		tick().then(() => {
			if (imageRef) {
				const initialRect = imageRef.getBoundingClientRect();
				if (initialRect.width > 0 && initialRect.height > 0 && canvasRef) {
					const wrapperRect = canvasRef.parentElement.getBoundingClientRect();
					displayWidth = initialRect.width;
					displayHeight = initialRect.height;
					canvasRef.width = displayWidth;
					canvasRef.height = displayHeight;
					canvasRef.style.left = `${initialRect.left - wrapperRect.left}px`;
					canvasRef.style.top = `${initialRect.top - wrapperRect.top}px`;

					if (showHandles) {
						requestAnimationFrame(drawCanvas);
					}
				} else {
				}

				observeImageResize(imageRef);
			} else {
			}
		});
	}

	function handleImageElementError() {
		if (!errorMessage) errorMessage = 'Error: Failed to load image preview.';
		stopObservingImageResize();
		resetStateOnError(true);
	}

	function refreshImage() {
		if (!imageUUID || !browser) {
			errorMessage = 'Cannot refresh image: No image UUID available.';

			resetStateOnError(true);
			return;
		}

		isLoading = true;
		isGeneratingPdf = false;
		loadingStep = 'Loading new version...';
		errorMessage = '';
		showHandles = false;
		stopObservingImageResize();
		cleanupBlobUrl();

		const newImageUrl = imageApi.getRenderImage(imageUUID) + '?t=' + Date.now();
		imageUrl = newImageUrl;
	}

	function resetStateOnError(keepError = false) {
		stopObservingImageResize();
		cleanupBlobUrl();

		imageFile = null;
		originalFilename = '';
		imageUUID = null;
		imageInfo = null;
		imageUrl = '';
		originalDimensions = null;
		naturalWidth = 0;
		naturalHeight = 0;
		displayWidth = 0;
		displayHeight = 0;
		isLoading = false;
		isGeneratingPdf = false;
		loadingStep = '';
		showHandles = false;
		activeHandleIndex = -1;

		if (!keepError) errorMessage = '';

		if (browser && ctx && canvasRef) {
			ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
			canvasRef.width = 0;
			canvasRef.height = 0;
			canvasRef.style.left = '0px';
			canvasRef.style.top = '0px';
			canvasRef.style.cursor = 'default';
			canvasRef.style.display = 'none';
		}
	}

	function truncateFilename(name, length = 25) {
		if (!name) return '';
		if (name.length <= length) return name;
		const extIndex = name.lastIndexOf('.');
		const ext = extIndex !== -1 ? name.substring(extIndex) : '';
		const base = extIndex !== -1 ? name.substring(0, extIndex) : name;
		const maxBaseLength = Math.max(0, length - ext.length - 3);
		const truncatedBase = base.length > maxBaseLength ? base.substring(0, maxBaseLength) : base;
		return `${truncatedBase}...${ext}`;
	}

	async function handleApplyScanAndUpload() {
		if (!imageFile || !naturalWidth || !naturalHeight) {
			errorMessage = 'Please select an image and wait for it to load completely.';

			return;
		}

		if (!showHandles || !currentBlobUrl) {
			errorMessage =
				'Cannot apply scan - editor state is inconsistent. Please re-select the image.';

			return;
		}

		isLoading = true;
		isGeneratingPdf = false;
		loadingStep = 'Scanning & Uploading...';
		errorMessage = '';
		showHandles = false;
		stopObservingImageResize();

		if (ctx && canvasRef) {
			ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
			canvasRef.style.display = 'none';
		}

		try {
			const originalCorners = handles.map((handle) => [
				Math.round(handle.x * naturalWidth),
				Math.round(handle.y * naturalHeight)
			]);

			const result = await imageApi.scanAndUpload(imageFile, originalCorners);

			imageInfo = result;
			imageUUID = result.UUID;
			imageFile = null;
			originalFilename = `Processed: ${result.UUID.substring(0, 8)}...`;

			cleanupBlobUrl();

			refreshImage();
		} catch (err) {
			errorMessage = err.message || 'An unknown error occurred during scanning and upload.';

			resetStateOnError(true);
		}
	}

	async function applyFilterAndUpdate(filterPromise, filterName = 'filter') {
		if (!imageInfo || !imageUUID || isBusy) {
			errorMessage = `Cannot apply ${filterName} - no valid server image state or already processing.`;

			return;
		}

		isLoading = true;
		loadingStep = `Applying ${filterName}...`;
		errorMessage = '';
		showHandles = false;
		stopObservingImageResize();

		try {
			const result = await filterPromise;

			imageInfo = result;
			imageUUID = result.UUID;

			refreshImage();
		} catch (filterErr) {
			errorMessage = filterErr.message || `Failed to apply ${filterName}.`;

			isLoading = false;
			loadingStep = '';

			tick().then(() => {
				if (imageRef) observeImageResize(imageRef);
			});
		}
	}

	function handleApplyRotate(angle) {
		if (!imageInfo || !imageUUID || isBusy) return;
		applyFilterAndUpdate(imageApi.applyRotateFilter(imageInfo.UUID, angle), `Rotate ${angle}°`);
	}

	async function handleUndo() {
		if (!imageInfo || !imageUUID || imageInfo.Version < 1 || isBusy) return;
		applyFilterAndUpdate(imageApi.undoChanges(imageInfo.UUID), 'Undo');
	}

	async function handleRedo() {
		if (!imageInfo || !imageUUID || isBusy) return;
		applyFilterAndUpdate(imageApi.redoChanges(imageInfo.UUID), 'Redo');
	}

	function handleOpenImage() {
		if (!imageUUID || isBusy) return;
		const url = imageApi.getRenderImage(imageUUID);
		const urlTs = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
		window.open(urlTs, '_blank');
	}

	async function handleDownloadPdf() {
		if (!canDownloadPdf || !browser) {
			return;
		}

		isGeneratingPdf = true;
		loadingStep = 'Generating PDF...';
		errorMessage = '';

		try {
			const renderUrl = imageApi.getRenderImage(imageUUID);

			const imageResponse = await fetch(renderUrl);
			if (!imageResponse.ok) {
				throw new Error(
					`Failed to fetch processed image data: ${imageResponse.status} ${imageResponse.statusText}`
				);
			}
			const imageBlob = await imageResponse.blob();

			const fileExtension = imageBlob.type.split('/')[1] || 'png';
			const filename = `scanned_${imageUUID}_v${imageInfo?.Version || 0}.${fileExtension}`;

			const imageFileForPdf = new File([imageBlob], filename, { type: imageBlob.type });

			await imageApi.imagesToPDF([imageFileForPdf]);
		} catch (err) {
			errorMessage = err.message || 'An unknown error occurred while generating the PDF.';
		} finally {
			isGeneratingPdf = false;
			loadingStep = '';
		}
	}

	function handleOpenImageClick() {
		if (isBusy || !browser) return;

		document.getElementById('file-input')?.click();
	}

	onMount(() => {
		if (browser) {
			setupResizeObserver();

			if (canvasRef) {
				ctx = canvasRef.getContext('2d');
			}
		}
	});

	onDestroy(() => {
		if (browser) {
			stopObservingImageResize();
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
			cleanupBlobUrl();
		}
	});

	$: isImageSelected = !!imageFile || !!imageUrl;
	$: isInitialLocalImageLoaded =
		!!imageFile && !!naturalWidth && naturalHeight > 0 && showHandles;
	$: isImageProcessed =
		!!imageInfo && !!imageUUID && !showHandles && !isBusy && !!imageUrl && !currentBlobUrl;

	$: canApplyScan = isInitialLocalImageLoaded && !isBusy;
	$: canEdit = isImageProcessed && !isBusy;
	$: canUndo = canEdit && imageInfo?.Version > 0;
	$: canRedo = canEdit;
	$: canOpenImage = isImageProcessed && !isBusy;
	$: canDownloadPdf = isImageProcessed && !isBusy;

	$: if (browser && canvasRef) {
		canvasRef.style.display = showHandles ? 'block' : 'none';

		if (!showHandles && ctx) {
			ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
		}

		if (showHandles && !isBusy && activeHandleIndex === -1) {
			canvasRef.style.cursor = 'grab';
		} else if (activeHandleIndex !== -1) {
			canvasRef.style.cursor = 'grabbing';
		} else {
			canvasRef.style.cursor = 'default';
		}
	}

	$: if (browser && canvasRef && !ctx) {
		ctx = canvasRef.getContext('2d');
	}
</script>

<svelte:head><title>Image Scanner - Slurp Tools</title></svelte:head>
<div class="editor-wrapper">
	<div class="page-container">
		{#if !isImageSelected && !isBusy}
			<div class="initial-upload-state" transition:fade={{ duration: 200 }}>
				<h1>Image Scanner</h1>
				<p class="tool-description">
					Select an image, adjust the red corners to define the area, and click "Scan &
					Upload".
				</p>
				<div class="input-area file-input-section">
					<button
						on:click={handleOpenImageClick}
						class="file-label button-like"
						disabled={isBusy}
						><svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							width="24"
							height="24"
							fill="currentColor"
							style="margin-bottom: 0.5rem;"
							><path
								d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"
							/></svg
						>Scan Image</button
					>
				</div>
				{#if errorMessage}<p class="error-message">{errorMessage}</p>{/if}
			</div>
		{:else if isBusy && !imageUrl}
			<div class="loading-state" transition:fade={{ duration: 200 }}>
				<div class="spinner"></div>
				<p>{loadingStep || 'Loading...'}</p>
				{#if errorMessage}<p class="error-message">{errorMessage}</p>{/if}
			</div>
		{:else if isImageSelected || isBusy}
			<div
				class="editor-interface"
				class:loading={isBusy}
				transition:fade={{ duration: 300 }}
			>
				<div class="top-toolbar">
					<div class="toolbar-left"><span class="toolbar-label">Scanner</span></div>
					<div class="toolbar-right">
						<button
							class="apply-button button-like toolbar-button"
							on:click={handleApplyScanAndUpload}
							disabled={!canApplyScan}
							title={!canApplyScan
								? 'Select image & wait for it to load fully, or process is busy'
								: 'Apply Perspective Correction & Scan Filters'}
							>{#if isLoading && loadingStep.startsWith('Scanning')}
								<span class="button-spinner"></span> {loadingStep}
							{:else}
								Scan & Upload
							{/if}</button
						>
					</div>
				</div>
				<div class="main-area">
					<div class="image-canvas-wrapper">
						{#if imageUrl}
							<img
								key={imageUrl}
								bind:this={imageRef}
								src={imageUrl}
								alt={originalFilename || 'Image preview'}
								on:load={handleImageLoad}
								on:error={handleImageElementError}
								style:opacity={isBusy && !showHandles ? 0.6 : 1}
							/>

							<canvas
								bind:this={canvasRef}
								on:mousedown={handleMouseDown}
								on:mousemove={handleMouseMove}
								on:mouseup={handleMouseUp}
								on:mouseleave={handleMouseLeaveCanvas}
								on:mouseenter={handleMouseEnterCanvas}
								on:touchstart={handleMouseDown}
								on:touchmove={handleMouseMove}
								on:touchend={handleMouseUp}
								style:touch-action={'none'}
							></canvas>
						{:else if !isBusy}
							<p class="placeholder-text error-message">Could not load image.</p>
						{/if}
					</div>

					{#if isBusy && loadingStep && !loadingStep.includes('Loading new version')}
						<div class="main-area-overlay">
							<div class="spinner"></div>
							<p>{loadingStep || 'Processing...'}</p>
						</div>
					{/if}
				</div>
				<div class="right-sidebar">
					<div class="sidebar-section file-management">
						<h4 class="h4-mauve">Image</h4>
						{#if originalFilename}
							<p class="filename" title={originalFilename}>
								{truncateFilename(originalFilename)}
							</p>
						{:else}
							<p class="placeholder-text">No image loaded.</p>
						{/if}
						{#if naturalWidth && naturalHeight}
							<p class="original-dims-info">
								Orig. Dims: {naturalWidth} x {naturalHeight} px
							</p>
						{/if}
					</div>

					<div class="sidebar-section controls">
						<h4 class="h4-teal">Edit Controls</h4>
						<div class="control-item history-controls">
							<button
								class="button-like history-button"
								on:click={() => handleApplyRotate(90)}
								disabled={!canEdit}
								title="Rotate 90° Clockwise"
								><svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									fill="currentColor"
									viewBox="0 0 16 16"
									><path
										fill-rule="evenodd"
										d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
									/><path
										d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"
									/></svg
								>
								<span>Rotate 90°</span></button
							><button
								class="button-like history-button"
								on:click={() => handleApplyRotate(-90)}
								disabled={!canEdit}
								title="Rotate 90° Counter-Clockwise"
								><svg
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
								<span>Rotate -90°</span></button
							>
						</div>
						<div class="control-item history-controls">
							<button
								class="button-like history-button"
								on:click={handleUndo}
								disabled={!canUndo}
								title="Undo Last Action"
								><svg
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
								<span>Undo</span></button
							><button
								class="button-like history-button"
								on:click={handleRedo}
								disabled={!canRedo}
								title="Redo Last Action"
								><svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									fill="currentColor"
									viewBox="0 0 16 16"
									><path
										fill-rule="evenodd"
										d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"
									/><path
										d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"
									/></svg
								>
								<span>Redo</span></button
							>
						</div>
					</div>

					<div class="sidebar-section download-section">
						<div style="display: flex; flex-direction: column; gap: 0.8rem;">
							<button
								on:click={handleOpenImage}
								class="button-like save-button"
								disabled={!canOpenImage}
								title="Open final image in a new tab">Open Image</button
							>

							<button
								on:click={handleDownloadPdf}
								class="button-like download-pdf-button"
								disabled={!canDownloadPdf}
								title={!canDownloadPdf
									? 'Process an image first or wait for current process'
									: 'Generate and download PDF'}
							>
								{#if isGeneratingPdf}
									<span class="button-spinner"></span>
									{loadingStep || 'Generating PDF...'}
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										fill="currentColor"
										viewBox="0 0 16 16"
										style="margin-right: 0.5em;"
									>
										<path
											d="M4.603 14.087a.8.8 0 0 1-1.087.955l-4.2-3.001a.8.8 0 0 1-.033-1.11l2.141-2.263a.8.8 0 1 1 1.162 1.09l-1.28 1.358 3.136 2.24a.8.8 0 0 1 .033 1.11z"
										/>
										<path
											fill-rule="evenodd"
											d="M5.824 1.936a2.5 2.5 0 0 1 4.352 0l2.141 2.262a.8.8 0 0 1-.033 1.11l-4.2 3.001a.8.8 0 0 1-1.087-.955l1.28-1.358-3.136-2.24a.8.8 0 0 1-.033-1.11l2.141-2.263zM8 5.616a.5.5 0 0 1 .5.5v3.868a.5.5 0 0 1-1 0V6.116a.5.5 0 0 1 .5-.5zm0 7.25a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6z"
										/>
										<path
											d="M12.25 2.642a1.5 1.5 0 0 0-2.75-1.053L8.64 2.5H7.36L6.5 1.589A1.5 1.5 0 0 0 3.75 2.642v10.716A1.5 1.5 0 0 0 5.25 14.9h5.5A1.5 1.5 0 0 0 12.25 13.358V2.642zm-1.5 0a.5.5 0 0 1 .5.5v10.716a.5.5 0 0 1-.5.5h-5.5a.5.5 0 0 1-.5-.5V3.142a.5.5 0 0 1 .5-.5h5.5z"
										/>
									</svg>
									Download PDF
								{/if}
							</button>
						</div>
					</div>

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
		--editor-v-margin: 3rem;
		--editor-fixed-height: calc(90vh - var(--editor-v-margin) - 1px);
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

	.initial-upload-state:only-child {
		border-radius: 12px;
	}
	.tool-description {
		margin-bottom: 1.5rem;
		color: var(--subtext0);
		max-width: 400px;
		line-height: 1.5;
	}
	.loading-state p {
		margin-top: 1rem;
		color: var(--text);
	}
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
	.toolbar-left,
	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.toolbar-label {
		font-size: 0.9rem;
		color: var(--base);
		margin-right: 0.5rem;
		font-weight: 600;
		font-family: var(--font-header);
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
				rgba(225, 240, 255, 0.4) 0 1px,
				transparent 1px var(--grid-size)
			),
			repeating-linear-gradient(
				90deg,
				rgba(225, 240, 255, 0.4) 0 1px,
				transparent 1px var(--grid-size)
			);

		background-size: var(--grid-size) var(--grid-size);
	}

	.image-canvas-wrapper {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		line-height: 0;
		overflow: hidden;
		box-sizing: border-box;
	}
	.image-canvas-wrapper img {
		display: block;
		max-width: 100%;
		max-height: 100%;
		width: auto;
		height: auto;
		object-fit: contain;
		opacity: 1;
		transition: opacity 0.3s ease;
		image-orientation: from-image;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		background-color: white;
		user-select: none;
		-webkit-user-drag: none;
	}
	.image-canvas-wrapper canvas {
		position: absolute;
		width: auto;
		height: auto;
		touch-action: none;
		pointer-events: auto;
		display: none;
	}
	.main-area-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: color-mix(in srgb, var(--base) 85%, transparent);
		backdrop-filter: blur(3px);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		z-index: 5;
		color: var(--text);
		text-align: center;
		pointer-events: none;
	}
	.main-area-overlay p {
		margin-top: 1rem;
		font-weight: 500;
		background: var(--mantle);
		padding: 8px 15px;
		border-radius: 5px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
	}
	.placeholder-text {
		font-size: 0.9rem;
		color: var(--subtext0);
		text-align: center;
		padding: 1rem 0;
	}
	.right-sidebar {
		grid-area: sidebar;
		background-color: var(--crust);
		width: var(--sidebar-width);
		padding: 1.5rem;
		overflow-y: auto;
		border-left: 1px solid var(--overlay0);
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
		background-color: var(--mantle);
	}
	.sidebar-section.file-management {
		background-color: color-mix(in srgb, var(--sapphire) 85%, var(--mantle));
		color: white;
	}
	.sidebar-section.file-management h4 {
		color: white;
		border-bottom-color: color-mix(in srgb, white 25%, transparent);
	}
	.sidebar-section.file-management .filename {
		background-color: var(--base);
		color: var(--text);
		border: 1px solid var(--overlay0);
	}
	.sidebar-section.file-management .original-dims-info {
		background: color-mix(in srgb, white 15%, transparent);
		color: white;
		opacity: 0.8;
		padding: 0.3rem 0.6rem;
		border-radius: 3px;
		display: inline-block;
		margin-bottom: 0.8rem;
		font-size: 0.8rem;
	}

	.sidebar-section.details {
		background-color: color-mix(in srgb, var(--pink) 85%, var(--mantle));
		color: white;
	}
	.sidebar-section.details h4 {
		color: white;
		border-bottom-color: color-mix(in srgb, white 25%, transparent);
	}
	.sidebar-section.details p {
		color: white;
		opacity: 0.95;
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.sidebar-section.controls {
		background-color: color-mix(in srgb, var(--teal) 85%, var(--mantle));
		color: white;
	}
	.sidebar-section.controls h4 {
		color: white;
		border-bottom-color: color-mix(in srgb, white 25%, transparent);
	}
	.sidebar-section.controls .history-button {
		background-color: var(--base);
		color: var(--teal);
		border-color: var(--overlay0);
	}
	.sidebar-section.controls .history-button:hover:not(:disabled) {
		background-color: var(--teal);
		color: white;
		border-color: var(--teal);
	}
	.sidebar-section.controls .history-button:disabled {
		background-color: var(--overlay0);
		color: var(--subtext0);
		border-color: var(--overlay0);
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
		border-bottom: 1px solid color-mix(in srgb, var(--text) 15%, transparent);
	}
	.sidebar-section .filename {
		font-size: 0.85rem;
		margin-bottom: 0.8rem;
		background-color: var(--base);
		color: var(--text);
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		overflow-wrap: break-word;
		word-break: break-all;
		border: 1px solid var(--overlay0);
		line-height: 1.4;
	}
	.button-like {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem 1.5rem;
		border: 1px solid var(--overlay1);
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
			box-shadow 0.2s ease,
			border-color 0.2s ease;
		text-decoration: none;
		line-height: 1.2;
		gap: 0.5rem;
		user-select: none;
		background-color: var(--surface1);
		color: var(--text);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
		width: 100%;
		box-sizing: border-box;
	}
	.button-like:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: all !important;
		box-shadow: none;
		transform: none;
		filter: grayscale(30%);
		background-color: var(--surface0);
		border-color: var(--overlay0);
		color: var(--subtext0);
	}
	.button-like:not(:disabled):hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		background-color: var(--surface2);
		border-color: var(--overlay2);
	}
	.button-like:active:not(:disabled) {
		transform: translateY(0px);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
		filter: brightness(0.98);
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
	.initial-upload-state .file-label:hover:not(:disabled) {
		background-color: var(--crust);
		border-color: var(--blue);
		color: var(--blue);
	}
	.apply-button {
		background-color: var(--green);
		color: var(--crust);
		border-color: var(--green);
		font-weight: 700;
	}
	.apply-button:hover:not(:disabled) {
		background-color: color-mix(in srgb, var(--green) 90%, white);
		border-color: color-mix(in srgb, var(--green) 90%, white);
		color: var(--crust);
	}
	.apply-button:disabled {
		background-color: var(--overlay0);
		color: var(--subtext0);
		border-color: var(--overlay0);
	}
	.toolbar-button {
		width: auto !important;
		padding: 0.5rem 1.2rem;
	}

	.save-button {
		background-color: var(--blue);
		color: var(--crust);
		border-color: var(--blue);
		font-weight: 700;
	}
	.save-button:hover:not(:disabled) {
		background-color: color-mix(in srgb, var(--blue) 90%, white);
		border-color: color-mix(in srgb, var(--blue) 90%, white);
	}
	.save-button:disabled {
		background-color: var(--overlay0);
		color: var(--subtext0);
		border-color: var(--overlay0);
	}

	.download-pdf-button {
		background-color: var(--red);
		color: var(--crust);
		border-color: var(--red);
		font-weight: 700;
	}
	.download-pdf-button:hover:not(:disabled) {
		background-color: color-mix(in srgb, var(--red) 90%, white);
		border-color: color-mix(in srgb, var(--red) 90%, white);
	}
	.download-pdf-button:disabled {
		background-color: var(--overlay0);
		color: var(--subtext0);
		border-color: var(--overlay0);
	}
	.download-pdf-button .button-spinner {
		border-color: color-mix(in srgb, var(--crust) 50%, transparent);
		border-top-color: var(--crust);
	}

	.history-button {
		flex: 1;
		padding: 0.5rem 0.8rem;
		font-size: 0.85rem;
		background-color: var(--base);
		color: var(--teal);
		border: 1px solid var(--overlay0);
		box-shadow: none;
		gap: 0.4rem;
		width: auto;
	}
	.history-button svg {
		width: 1em;
		height: 1em;
		vertical-align: middle;
		flex-shrink: 0;
	}
	.history-button:hover:not(:disabled) {
		background-color: var(--teal);
		color: white;
		border-color: var(--teal);
	}
	.history-button:disabled {
		background-color: var(--overlay0);
		color: var(--subtext0);
		border-color: var(--overlay0);
	}
	.control-item {
		margin-bottom: 0.8rem;
	}
	.control-item:last-child {
		margin-bottom: 0;
	}
	.history-controls {
		display: flex;
		gap: 0.8rem;
		justify-content: space-between;
	}
	.error-message {
		background-color: color-mix(in srgb, var(--red) 15%, var(--mantle));
		color: var(--red);
		border: 1px solid color-mix(in srgb, var(--red) 50%, transparent);
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
		background-color: color-mix(in srgb, var(--red) 15%, var(--mantle));
		color: var(--red);
		border: 1px solid color-mix(in srgb, var(--red) 50%, transparent);
		font-size: 0.85rem;
		padding: 0.6rem 1rem;
		border-radius: 6px;
	}
	.spinner {
		border: 4px solid var(--overlay1);
		border-top: 4px solid var(--blue);
		border-radius: 50%;
		width: 35px;
		height: 35px;
		animation: spin 1s linear infinite;
	}
	.button-spinner {
		border: 2px solid color-mix(in srgb, currentColor 50%, transparent);
		border-top-color: currentColor;
		border-radius: 50%;
		width: 0.9em;
		height: 0.9em;
		animation: spin 0.8s linear infinite;
		display: inline-block;
		vertical-align: middle;
		margin: 0 0.5em 0 0;
		line-height: 0;
	}

	.apply-button .button-spinner {
		border-color: color-mix(in srgb, var(--crust) 50%, transparent);
		border-top-color: var(--crust);
	}
	.save-button .button-spinner {
		border-color: color-mix(in srgb, var(--crust) 50%, transparent);
		border-top-color: var(--crust);
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
			--editor-v-margin: 0rem;
			--editor-fixed-height: auto;
			--sidebar-width: 100%;
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
			max-height: none;
		}
		.editor-interface {
			grid-template-areas: 'toolbar' 'main' 'sidebar';
			grid-template-rows: var(--toolbar-height) minmax(300px, 55vh) auto;
			grid-template-columns: 1fr;
			height: auto;
			border-radius: 0;
		}

		.top-toolbar {
			border-radius: 0;
		}
		.main-area {
			border-radius: 0;
		}
		.right-sidebar {
			border-radius: 0;
		}

		.main-area {
			padding: 0.8rem;
		}
		.right-sidebar {
			width: 100%;
			max-height: none;
			height: auto;
			border-left: none;
			border-top: 1px solid var(--overlay0);
			box-shadow: none;
			padding: 1rem;
			gap: 1rem;
			overflow-y: visible;
		}
		.sidebar-section.download-section {
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
		.control-item.history-controls {
			justify-content: space-around;
		}
	}
	@media (max-width: 480px) {
		:root {
			--toolbar-height: 50px;
			--grid-size: 15px;
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
		.right-sidebar {
			padding: 1rem;
			gap: 1rem;
		}
		.main-area {
			padding: 0.5rem;
		}
		.initial-upload-state h1 {
			font-size: 1.5rem;
		}
		.sidebar-error {
			font-size: 0.8rem;
			padding: 0.5rem 0.8rem;
		}
	}
</style>
