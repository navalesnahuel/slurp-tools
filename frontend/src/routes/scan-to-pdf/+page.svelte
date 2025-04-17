<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';

	// ** VERIFY THIS PATH IS CORRECT **
	import * as imageApi from '$lib/services/imageApi.js'; // Ensure this path is right!

	// --- State Variables ---
	let imageFile = null; // The currently selected local file
	let originalFilename = ''; // Name of the original local file
	let imageUUID = null; // UUID from the server after processing
	let imageInfo = null; // { UUID, Version } from the server
	let imageUrl = ''; // URL to display (blob URL for local, server URL for processed)
	let currentBlobUrl = null; // Specifically tracks the active blob URL for revocation
	let isLoading = false;
	let loadingStep = '';
	let errorMessage = '';

	// Image/Canvas related state
	let imageRef = null; // bind:this={imageRef}
	let canvasRef = null; // bind:this={canvasRef}
	let ctx = null;
	let originalDimensions = null; // { width, height } - Natural dimensions of the image
	let naturalWidth = 0;
	let naturalHeight = 0;
	let displayWidth = 0; // Rendered width of the image in the container
	let displayHeight = 0; // Rendered height of the image in the container

	// Perspective Handles State
	const HANDLE_RADIUS = 8;
	let handles = [
		{ x: 0.05, y: 0.05 },
		{ x: 0.95, y: 0.05 },
		{ x: 0.95, y: 0.95 },
		{ x: 0.05, y: 0.95 }
	];
	let activeHandleIndex = -1;
	let showHandles = false; // Controls visibility of handles and canvas overlay

	// --- Resize Observer ---
	let resizeObserver = null;

	function setupResizeObserver() {
		if (!browser) return;
		resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				if (
					entry.target === imageRef &&
					canvasRef &&
					canvasRef.parentElement &&
					showHandles // Only update canvas if handles are meant to be shown
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
							// Use requestAnimationFrame to ensure drawing happens after layout updates
							requestAnimationFrame(drawCanvas);
						}
					} else {
						// Handle cases where image dimensions become invalid (e.g., display:none)
						if (displayWidth > 0 || displayHeight > 0) {
							console.warn(
								`[DEBUG] ResizeObserver: Image dimensions invalid (${newWidth}x${newHeight}). Resetting canvas.`
							);
							canvasRef.style.left = `0px`;
							canvasRef.style.top = `0px`;
							canvasRef.width = 0;
							canvasRef.height = 0;
							displayWidth = 0;
							displayHeight = 0;
							if (ctx) ctx.clearRect(0, 0, 0, 0); // Clear the (now zero-sized) canvas
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
			} catch (e) {
				// Ignore errors if element is already gone
			}
		}
	}

	// --- Cleanup ---
	function cleanupBlobUrl() {
		if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) {
			console.log('[DEBUG] Revoking Blob URL:', currentBlobUrl);
			URL.revokeObjectURL(currentBlobUrl);
			currentBlobUrl = null;
		}
	}

	// --- File Selection (Handles the initial/only file selection) ---
	function handleFileSelect(event) {
		const fileInput = event.target;
		const file = fileInput.files?.[0];
		if (file && browser) {
			console.log('[DEBUG] handleFileSelect: New file selected:', file.name);

			// --- Reset State for the Newly Selected File ---
			stopObservingImageResize(); // Stop observing any previous image
			cleanupBlobUrl(); // Clean up any old blob url

			// Reset all relevant state variables
			imageFile = file; // Store the new file object
			imageUUID = null; // Clear any previous server UUID
			imageInfo = null; // Clear any previous server info
			originalFilename = file.name; // Store the new file's name
			errorMessage = '';
			isLoading = false; // Start fresh, not loading yet
			loadingStep = 'Loading image...'; // Indicate loading the preview
			handles = [
				// Reset handles to default positions
				{ x: 0.05, y: 0.05 },
				{ x: 0.95, y: 0.05 },
				{ x: 0.95, y: 0.95 },
				{ x: 0.05, y: 0.95 }
			];
			showHandles = true; // Show handles immediately for adjustment
			originalDimensions = null; // Reset dimensions (will be set on load)
			naturalWidth = 0;
			naturalHeight = 0;
			displayWidth = 0; // Reset display dimensions
			displayHeight = 0;
			if (ctx && canvasRef) {
				// Clear canvas if context exists
				ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
				canvasRef.width = 0;
				canvasRef.height = 0;
			}

			// --- Create and set NEW Blob URL for Preview ---
			imageUrl = URL.createObjectURL(file);
			currentBlobUrl = imageUrl; // Track the new blob URL for cleanup

			// --- Reset file input to allow selecting the same file again later if needed ---
			fileInput.value = null;

			console.log(
				'[DEBUG] handleFileSelect: State prepared for new local image preview. Waiting for img on:load.'
			);
		} else {
			console.log('[DEBUG] handleFileSelect: No file selected or selection cancelled.');
			if (fileInput) fileInput.value = null; // Reset input even on cancel
			// No state reset needed here if the user cancels - keep the existing image shown if any.
		}
	}

	// --- Canvas Drawing & Interaction ---
	function drawCanvas() {
		if (
			!canvasRef ||
			!imageRef ||
			!ctx ||
			!showHandles || // Don't draw if handles are hidden
			displayWidth <= 0 ||
			displayHeight <= 0 ||
			!browser
		) {
			// If context exists but we shouldn't draw, ensure canvas is clear
			if (ctx && canvasRef) ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
			return; // Conditions not met for drawing
		}

		// Clear previous frame
		ctx.clearRect(0, 0, displayWidth, displayHeight);

		// Draw perspective lines
		ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(handles[0].x * displayWidth, handles[0].y * displayHeight);
		for (let i = 1; i < handles.length; i++) {
			ctx.lineTo(handles[i].x * displayWidth, handles[i].y * displayHeight);
		}
		ctx.closePath();
		ctx.stroke();

		// Draw handles
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

	// --- Mouse/Touch Event Handling for Handles ---
	function getEventPos(event) {
		if (!canvasRef) return { x: 0, y: 0 };
		const rect = canvasRef.getBoundingClientRect();
		const clientX = event.touches ? event.touches[0].clientX : event.clientX;
		const clientY = event.touches ? event.touches[0].clientY : event.clientY;
		return { x: clientX - rect.left, y: clientY - rect.top };
	}

	function handleMouseDown(event) {
		event.preventDefault();
		if (
			!showHandles ||
			isLoading ||
			!browser ||
			displayWidth <= 0 ||
			displayHeight <= 0 ||
			!canvasRef
		)
			return;

		const pos = getEventPos(event);
		const hitRadiusSquared = (HANDLE_RADIUS * 1.8) ** 2; // Larger hit area

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
		activeHandleIndex = -1; // No handle hit
	}

	function handleMouseMove(event) {
		event.preventDefault();
		if (
			activeHandleIndex === -1 ||
			isLoading ||
			!canvasRef ||
			!browser ||
			displayWidth <= 0 ||
			displayHeight <= 0
		)
			return;

		const pos = getEventPos(event);
		// Calculate position relative to display size, clamped between 0 and 1
		let newX = Math.max(0, Math.min(1, pos.x / displayWidth));
		let newY = Math.max(0, Math.min(1, pos.y / displayHeight));

		handles[activeHandleIndex].x = newX;
		handles[activeHandleIndex].y = newY;

		requestAnimationFrame(drawCanvas); // Redraw canvas on move
	}

	function handleMouseUp(event) {
		event.preventDefault(); // Prevent potential lingering effects
		if (activeHandleIndex !== -1) {
			activeHandleIndex = -1;
			if (canvasRef && showHandles) canvasRef.style.cursor = 'grab'; // Reset cursor if handles still visible
		}
	}

	function handleMouseEnterCanvas() {
		if (showHandles && !isLoading && canvasRef && activeHandleIndex === -1) {
			canvasRef.style.cursor = 'grab';
		}
	}

	function handleMouseLeaveCanvas() {
		// Reset cursor if not actively dragging a handle
		if (activeHandleIndex === -1 && !isLoading && canvasRef) {
			canvasRef.style.cursor = 'default';
		}
	}

	// --- Image Loading & Dimension Fetching ---
	function handleImageLoad() {
		if (!imageRef || !browser) {
			console.warn('[DEBUG] handleImageLoad: Called but imageRef or browser missing.');
			return;
		}

		naturalWidth = imageRef.naturalWidth;
		naturalHeight = imageRef.naturalHeight;
		originalDimensions = { width: naturalWidth, height: naturalHeight };

		console.log(
			`[DEBUG] handleImageLoad: Image loaded. Natural dims: ${naturalWidth}x${naturalHeight}. URL type: ${imageUrl.startsWith('blob:') ? 'Blob' : 'Server/Other'}`
		);

		// Determine if loading finished based on loadingStep
		if (loadingStep === 'Loading image...' || loadingStep === 'Loading new version...') {
			isLoading = false;
			loadingStep = '';
			console.log('[DEBUG] handleImageLoad: Loading finished, isLoading set to false.');
		} else if (isLoading) {
			// If still marked as loading but step is unexpected, reset loading state anyway
			console.warn(
				'[DEBUG] handleImageLoad: Finished loading, but loadingStep was unexpected:',
				loadingStep,
				'. Resetting isLoading.'
			);
			isLoading = false;
			loadingStep = '';
		}

		// Get canvas context if not already available
		if (!ctx && canvasRef) {
			ctx = canvasRef.getContext('2d');
			console.log('[DEBUG] handleImageLoad: Canvas context obtained.');
		}

		// Use tick to ensure the image element has potentially been rendered and sized
		tick().then(() => {
			if (imageRef) {
				// Get initial display size immediately after load/tick
				const initialRect = imageRef.getBoundingClientRect();
				if (initialRect.width > 0 && initialRect.height > 0 && canvasRef) {
					const wrapperRect = canvasRef.parentElement.getBoundingClientRect();
					displayWidth = initialRect.width;
					displayHeight = initialRect.height;
					canvasRef.width = displayWidth;
					canvasRef.height = displayHeight;
					canvasRef.style.left = `${initialRect.left - wrapperRect.left}px`;
					canvasRef.style.top = `${initialRect.top - wrapperRect.top}px`;
					console.log(
						`[DEBUG] handleImageLoad: Initial canvas setup. Size: ${displayWidth.toFixed(1)}x${displayHeight.toFixed(1)}`
					);
					requestAnimationFrame(drawCanvas); // Draw initial state
				} else {
					console.warn(
						'[DEBUG] handleImageLoad: Image rect invalid after tick. Canvas not sized.'
					);
				}
				// Start observing for subsequent resizes
				observeImageResize(imageRef);
			} else {
				console.error(
					'[DEBUG] handleImageLoad: Image ref missing AFTER tick(). Cannot observe or setup canvas.'
				);
			}
		});
	}

	function handleImageElementError() {
		console.error('[DEBUG] handleImageElementError: Image element failed to load:', imageUrl);
		if (!errorMessage) errorMessage = 'Error: Failed to load image preview.';
		stopObservingImageResize();
		resetStateOnError(true); // Reset state, keeping the error message
	}

	// --- Image Update / Refresh (After Server Processing) ---
	function refreshImage() {
		if (!imageUUID || !browser) {
			errorMessage = 'Cannot refresh image: No image UUID available.';
			console.warn('[DEBUG] refreshImage: Cannot refresh - No UUID or browser env false.');
			resetStateOnError(true); // Reset, keeping error
			return;
		}
		console.log('[DEBUG] refreshImage: Starting refresh for UUID:', imageUUID);

		isLoading = true;
		loadingStep = 'Loading new version...';
		errorMessage = '';
		showHandles = false; // Hide handles for processed image view
		stopObservingImageResize(); // Stop observing the old blob/server image if any
		cleanupBlobUrl(); // Ensure any local blob URL is revoked

		// Construct the new image URL with a timestamp to bypass cache
		const newImageUrl = imageApi.getRenderImage(imageUUID) + '?t=' + Date.now();
		imageUrl = newImageUrl; // Update the imageUrl to trigger Svelte's reactivity

		console.log('[DEBUG] refreshImage: New server imageUrl set. Waiting for img on:load.');
		// handleImageLoad will be called when the new image successfully loads
	}

	// --- Helper to Reset State (Used on error or potentially before new file selection) ---
	function resetStateOnError(keepError = false) {
		console.log('[DEBUG] resetStateOnError: Resetting state. Keep error:', keepError);
		stopObservingImageResize();
		cleanupBlobUrl();

		// Reset all key state variables
		imageFile = null;
		originalFilename = '';
		imageUUID = null;
		imageInfo = null;
		imageUrl = ''; // Clear the image source
		originalDimensions = null;
		naturalWidth = 0;
		naturalHeight = 0;
		displayWidth = 0;
		displayHeight = 0;
		isLoading = false;
		loadingStep = '';
		showHandles = false; // Ensure handles are hidden on reset
		activeHandleIndex = -1; // Reset active handle

		if (!keepError) errorMessage = ''; // Clear error message unless requested otherwise

		// Clear and reset canvas if it exists
		if (browser && ctx && canvasRef) {
			ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
			canvasRef.width = 0;
			canvasRef.height = 0;
			canvasRef.style.left = '0px';
			canvasRef.style.top = '0px';
			canvasRef.style.cursor = 'default';
			canvasRef.style.display = 'none'; // Ensure canvas is hidden
		}
	}

	// --- Truncate Filename Helper ---
	function truncateFilename(name, length = 25) {
		if (!name) return '';
		if (name.length <= length) return name;
		const extIndex = name.lastIndexOf('.');
		const ext = extIndex !== -1 ? name.substring(extIndex) : '';
		const base = extIndex !== -1 ? name.substring(0, extIndex) : name;
		const maxBaseLength = Math.max(0, length - ext.length - 3); // Account for '...'
		const truncatedBase = base.length > maxBaseLength ? base.substring(0, maxBaseLength) : base;
		return `${truncatedBase}...${ext}`;
	}

	// --- CORE WORKFLOW: Scan & Upload Local Image ---
	async function handleApplyScanAndUpload() {
		console.log('[DEBUG] handleApplyScanAndUpload: Function called.');
		if (!imageFile || !naturalWidth || !naturalHeight) {
			errorMessage = 'Please select an image and wait for it to load completely.';
			console.warn(
				'[DEBUG] handleApplyScanAndUpload: Cannot apply - missing image file or natural dimensions.'
			);
			return;
		}
		// Double check we are in the correct state (local file loaded, handles shown)
		if (!showHandles || !currentBlobUrl) {
			errorMessage =
				'Cannot apply scan - editor state is inconsistent. Please re-select the image.';
			console.warn(
				'[DEBUG] handleApplyScanAndUpload: State inconsistent (showHandles or currentBlobUrl missing).'
			);
			return;
		}

		console.log('[DEBUG] handleApplyScanAndUpload: Proceeding with Scan & Upload.');
		isLoading = true;
		loadingStep = 'Scanning & Uploading...';
		errorMessage = '';
		showHandles = false; // Hide handles during/after processing
		stopObservingImageResize(); // Stop observing the local image

		// Clear canvas visually as handles are hidden
		if (ctx && canvasRef) {
			ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
			canvasRef.style.display = 'none'; // Hide canvas element itself
		}

		try {
			// Convert relative handle coordinates (0-1) to absolute pixel coordinates based on natural image size
			const originalCorners = handles.map((handle) => [
				Math.round(handle.x * naturalWidth),
				Math.round(handle.y * naturalHeight)
			]);

			console.log(
				'[DEBUG] handleApplyScanAndUpload: Calling imageApi.scanAndUpload with corners:',
				originalCorners
			);
			const result = await imageApi.scanAndUpload(imageFile, originalCorners);
			console.log('[DEBUG] handleApplyScanAndUpload: API Success:', result);

			// Update state with server response
			imageInfo = result;
			imageUUID = result.UUID;
			imageFile = null; // Clear the local file reference, we now rely on the server version
			originalFilename = `Processed: ${result.UUID.substring(0, 8)}...`; // Update displayed name

			cleanupBlobUrl(); // Revoke the local blob URL, no longer needed

			// Trigger refresh to load the processed image from the server
			refreshImage();
		} catch (err) {
			console.error('[DEBUG] handleApplyScanAndUpload: API Failed:', err);
			errorMessage = err.message || 'An unknown error occurred during scanning and upload.';
			// Reset state completely on failure, keeping the error message
			resetStateOnError(true);
		}
		// isLoading and loadingStep are handled by refreshImage -> handleImageLoad
	}

	// --- Helper for subsequent UUID-based filters/actions ---
	async function applyFilterAndUpdate(filterPromise, filterName = 'filter') {
		if (!imageInfo || !imageUUID || isLoading) {
			// Ensure we have server info and UUID
			errorMessage = `Cannot apply ${filterName} - no valid server image state or already processing.`;
			console.warn(
				`[DEBUG] applyFilterAndUpdate (${filterName}): Cannot apply - missing imageInfo/UUID or isLoading.`
			);
			return;
		}
		console.log(
			`[DEBUG] applyFilterAndUpdate (${filterName}): Starting for UUID: ${imageUUID}`
		);

		isLoading = true;
		loadingStep = `Applying ${filterName}...`;
		errorMessage = '';
		showHandles = false; // Ensure handles remain hidden
		stopObservingImageResize(); // May not be strictly needed if already stopped, but safe

		try {
			// Await the specific API call (passed as filterPromise)
			const result = await filterPromise;
			console.log(`[DEBUG] applyFilterAndUpdate (${filterName}): API Success:`, result);

			// Update state with the new version/info from the server
			imageInfo = result;
			imageUUID = result.UUID; // Should be the same, but update just in case

			// No need to cleanupBlobUrl here as it should already be cleaned after initial upload

			// Refresh the image view to show the result of the filter
			refreshImage();
		} catch (filterErr) {
			console.error(`[DEBUG] applyFilterAndUpdate (${filterName}): API Failed:`, filterErr);
			errorMessage = filterErr.message || `Failed to apply ${filterName}.`;
			// Reset loading state on error, but keep the image displayed (don't call resetStateOnError unless needed)
			isLoading = false;
			loadingStep = '';
			// Re-enable observation if the image element is still present, as refreshImage wasn't successful
			tick().then(() => {
				if (imageRef) observeImageResize(imageRef);
			});
		}
		// isLoading and loadingStep are handled by refreshImage -> handleImageLoad on success
	}

	// --- Specific Action Handlers (Using the Helper) ---
	function handleApplyRotate(angle) {
		if (!imageInfo || !imageUUID) return; // Guard against calling without server state
		applyFilterAndUpdate(imageApi.applyRotateFilter(imageInfo.UUID, angle), `Rotate ${angle}°`);
	}

	async function handleUndo() {
		if (!imageInfo || !imageUUID || imageInfo.Version < 1) return; // Guard: Must have server state and history
		applyFilterAndUpdate(imageApi.undoChanges(imageInfo.UUID), 'Undo');
	}

	async function handleRedo() {
		if (!imageInfo || !imageUUID) return; // Guard against calling without server state
		applyFilterAndUpdate(imageApi.redoChanges(imageInfo.UUID), 'Redo');
	}

	function handleOpenImage() {
		if (!imageUUID || isLoading) return; // Guard: Must have processed image UUID, not loading
		const url = imageApi.getRenderImage(imageUUID);
		const urlTs = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`; // Add timestamp to bypass cache
		window.open(urlTs, '_blank');
	}

	// --- Trigger File Input ---
	function handleOpenImageClick() {
		if (isLoading || !browser) return;
		console.log('[DEBUG] handleOpenImageClick: Triggering file input.');
		// Resetting state here could be disruptive if user cancels.
		// Let handleFileSelect manage the state reset *if* a file is actually chosen.
		document.getElementById('file-input')?.click();
	}

	// --- Lifecycle ---
	onMount(() => {
		if (browser) {
			setupResizeObserver();
			// Get canvas context right away if canvas element exists
			if (canvasRef) {
				ctx = canvasRef.getContext('2d');
				console.log('[DEBUG] onMount: Initial canvas context obtained.');
			}
		}
	});

	onDestroy(() => {
		if (browser) {
			console.log('[DEBUG] onDestroy: Cleaning up...');
			stopObservingImageResize();
			if (resizeObserver) {
				resizeObserver.disconnect();
				console.log('[DEBUG] onDestroy: ResizeObserver disconnected.');
			}
			cleanupBlobUrl(); // Clean up any lingering blob URL
		}
	});

	// --- Reactive States for UI Logic ---
	$: isImageSelected = !!imageFile || !!imageUrl; // True if local file selected OR server image URL exists
	$: isInitialLocalImageLoaded =
		!!imageFile && !!naturalWidth && naturalHeight > 0 && showHandles; // Ready for perspective adjustment
	$: isImageProcessed =
		!!imageInfo && !!imageUUID && !showHandles && !isLoading && !!imageUrl && !currentBlobUrl; // Server image is loaded and displayed
	$: canApplyScan = isInitialLocalImageLoaded && !isLoading; // Can only scan when local image loaded & handles shown
	$: canEdit = isImageProcessed && !isLoading; // Can only edit (rotate, undo, redo) when processed image is displayed
	$: canUndo = canEdit && imageInfo?.Version > 0;
	$: canRedo = canEdit; // Redo capability check might need more info from API in future
	$: canOpenImage = isImageProcessed && !isLoading; // Can open the final image

	// --- Reactive Updates for Canvas Visibility and Clearing ---
	$: if (browser && canvasRef) {
		// Control canvas display based on showHandles
		canvasRef.style.display = showHandles ? 'block' : 'none';
		// If handles are hidden, ensure the canvas content is cleared
		if (!showHandles && ctx) {
			ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
		}
		// Update cursor based on state
		if (showHandles && !isLoading && activeHandleIndex === -1) {
			canvasRef.style.cursor = 'grab';
		} else if (activeHandleIndex !== -1) {
			canvasRef.style.cursor = 'grabbing';
		} else {
			canvasRef.style.cursor = 'default';
		}
	}

	// Attempt to get context if canvasRef becomes available later
	$: if (browser && canvasRef && !ctx) {
		console.log('[DEBUG] Reactive Effect: canvasRef exists, getting context.');
		ctx = canvasRef.getContext('2d');
	}
</script>

<!-- TEMPLATE (HTML - Removed "Change Image" button) -->
<svelte:head><title>Image Scanner - Slurp Tools</title></svelte:head>
<div class="editor-wrapper">
	<div class="page-container">
		{#if !isImageSelected && !isLoading}
			<!-- Initial State: Prompt to Open Image -->
			<div class="initial-upload-state" transition:fade={{ duration: 200 }}>
				<h1>Image Scanner</h1>
				<p class="tool-description">
					Select an image, adjust the red corners to define the area, and click "Scan &
					Upload".
				</p>
				<div class="input-area file-input-section">
					<!-- Modified Button to Trigger File Input -->
					<button on:click={handleOpenImageClick} class="file-label button-like"
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
						>Open Image</button
					>
				</div>
				{#if errorMessage}<p class="error-message">{errorMessage}</p>{/if}
			</div>
		{:else if isLoading && !imageUrl}
			<!-- Loading State (e.g., initial API call before image URL is known) -->
			<div class="loading-state" transition:fade={{ duration: 200 }}>
				<div class="spinner"></div>
				<p>{loadingStep || 'Loading...'}</p>
				{#if errorMessage}<p class="error-message">{errorMessage}</p>{/if}
			</div>
		{:else if isImageSelected || isLoading}
			<!-- Editor Interface: Shown once an image is selected or loading -->
			<div
				class="editor-interface"
				class:loading={isLoading}
				transition:fade={{ duration: 300 }}
			>
				<div class="top-toolbar">
					<div class="toolbar-left"><span class="toolbar-label">Scanner</span></div>
					<div class="toolbar-right">
						<!-- Scan & Upload Button -->
						<button
							class="apply-button button-like toolbar-button"
							on:click={handleApplyScanAndUpload}
							disabled={!canApplyScan}
							title={!canApplyScan
								? 'Select image & wait for it to load fully'
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
						<!-- Image Display Area -->
						{#if imageUrl}
							<img
								key={imageUrl}
								bind:this={imageRef}
								src={imageUrl}
								alt={originalFilename || 'Image preview'}
								on:load={handleImageLoad}
								on:error={handleImageElementError}
								style:opacity={isLoading && !showHandles ? 0.6 : 1}
							/>
							<!-- Canvas Overlay for Handles -->
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
						{:else if !isLoading}
							<!-- Fallback if imageUrl is missing but not loading -->
							<p class="placeholder-text error-message">Could not load image.</p>
						{/if}
					</div>
					<!-- Loading Overlay for Main Area (shown during scan/upload, not during version load) -->
					{#if isLoading && loadingStep && !loadingStep.includes('Loading new version')}
						<div class="main-area-overlay">
							<div class="spinner"></div>
							<p>{loadingStep || 'Processing...'}</p>
						</div>
					{/if}
				</div>
				<div class="right-sidebar">
					<!-- File Info Section -->
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
						<!-- "Change Image" Button Removed -->
					</div>
					<!-- Status/Instructions Section -->
					<div class="sidebar-section details">
						<h4 class="h4-pink">Status & Instructions</h4>
						{#if isInitialLocalImageLoaded}
							<p>
								Drag the red corners to define the perspective, then click "Scan &
								Upload" in the toolbar.
							</p>
						{:else if showHandles && !!imageFile && !(!!naturalWidth && naturalHeight > 0)}
							<p>Loading image preview, please wait...</p>
						{:else if isImageProcessed}
							<p>
								Scan complete (Version: {imageInfo?.Version ?? 'N/A'}). Use edit
								controls below or open a new image.
							</p>
						{:else if isLoading}
							<p>{loadingStep || 'Processing'}...</p>
						{:else}
							<p>Select an image using the 'Open Image' button.</p>
						{/if}
					</div>
					<!-- Edit Controls Section -->
					<div class="sidebar-section controls">
						<h4 class="h4-teal">Edit Controls</h4>
						<div class="control-item history-controls">
							<!-- Rotate Buttons -->
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
							<!-- Undo/Redo Buttons -->
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
					<!-- Open/Download Section -->
					<div class="sidebar-section download-section">
						<button
							on:click={handleOpenImage}
							class="button-like save-button"
							disabled={!canOpenImage}
							title="Open final image in a new tab">Open Image</button
						>
					</div>
					<!-- Sidebar Error Message Area -->
					{#if errorMessage}<p class="error-message sidebar-error">{errorMessage}</p>{/if}
				</div>
			</div>
		{/if}
		<!-- Hidden File Input -->
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
	/* --- Layout Variables --- */
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
		font-weight: 500;
	}

	/* --- MODIFIED Main Area Style --- */
	.main-area {
		grid-area: main;
		overflow: hidden;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1.2rem;
		box-sizing: border-box;

		/* --- SOLID BASE + GRID LINES BACKGROUND --- */
		background-color: var(--base); /* Solid background color */
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
		background-size: var(--grid-size, 20px) var(--grid-size, 20px); /* Size of one grid square */
		/* --- END SOLID BASE + GRID LINES BACKGROUND --- */
	}
	/* --- END MODIFIED Main Area Style --- */

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
		position: absolute; /* left/top set by JS */
		width: auto;
		height: auto;
		touch-action: none;
		pointer-events: auto;
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
		background-color: var(--mantle);
	}
	.sidebar-section.file-management {
		background-color: var(--sapphire);
		color: white;
	}
	.sidebar-section.file-management h4 {
		color: white;
		border-bottom-color: color-mix(in srgb, white 25%, transparent);
	}
	.sidebar-section.file-management .filename {
		background-color: var(--base);
		color: var(--text);
		border: 1px solid var(--overlay);
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
	.sidebar-section.file-management .change-button {
		background-color: var(--base);
		color: var(--sapphire);
		border-color: var(--overlay);
	}
	.sidebar-section.file-management .change-button:hover:not(:disabled) {
		background-color: var(--overlay);
		color: var(--sapphire);
		border-color: var(--overlay);
	}
	.sidebar-section.details {
		background-color: var(--pink);
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
		background-color: var(--teal);
		color: white;
	}
	.sidebar-section.controls h4 {
		color: white;
		border-bottom-color: color-mix(in srgb, white 25%, transparent);
	}
	.sidebar-section.controls .history-button {
		background-color: var(--base);
		color: var(--teal);
		border-color: var(--overlay);
	}
	.sidebar-section.controls .history-button:hover:not(:disabled) {
		background-color: var(--teal);
		color: white;
		border-color: var(--teal);
	}
	.sidebar-section.controls .history-button:disabled {
		background-color: var(--overlay);
		color: var(--subtext0);
		border-color: var(--overlay);
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
		border: 1px solid var(--overlay);
		line-height: 1.4;
	}
	.button-like {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem 1.5rem;
		border: 1px solid var(--overlay);
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
		background-color: var(--base);
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
		background-color: var(--overlay);
		border-color: var(--overlay);
	}
	.button-like:not(:disabled):not(.disabled):hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}
	.button-like:active:not(:disabled):not(.disabled) {
		transform: translateY(0px);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
		filter: brightness(0.98);
	}
	.initial-upload-state .file-label {
		border: 2px dashed var(--overlay);
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
		color: white;
		border-color: var(--green);
	}
	.apply-button:hover:not(:disabled) {
		background-color: color-mix(in srgb, var(--green) 90%, black);
		border-color: color-mix(in srgb, var(--green) 90%, black);
		color: white;
	}
	.toolbar-button {
		width: auto !important;
		padding: 0.5rem 1.2rem;
	}
	.change-button {
		background-color: var(--base);
		color: var(--sapphire);
		border-color: var(--overlay);
		padding: 0.6rem 1rem;
		font-size: 0.9rem;
		box-shadow: none;
	}
	.change-button:hover:not(:disabled) {
		background-color: var(--sapphire);
		color: white;
		border-color: var(--sapphire);
	}
	.save-button {
		background-color: var(--blue);
		color: white;
		border-color: var(--blue);
	}
	.save-button:hover:not(:disabled) {
		background-color: color-mix(in srgb, var(--blue) 90%, black);
		border-color: color-mix(in srgb, var(--blue) 90%, black);
	}
	.history-button {
		flex: 1;
		padding: 0.5rem 0.8rem;
		font-size: 0.85rem;
		background-color: var(--mantle);
		color: var(--teal);
		border: 1px solid var(--overlay);
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
		background-color: var(--overlay);
		color: var(--subtext0);
		border-color: var(--overlay);
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
		background-color: color-mix(in srgb, var(--red) 10%, var(--base));
		color: var(--red);
		border: 1px solid color-mix(in srgb, var(--red) 40%, transparent);
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
		border: 4px solid var(--overlay);
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
		border-color: color-mix(in srgb, white 50%, transparent);
		border-top-color: white;
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
			grid-template-rows: var(--toolbar-height) minmax(300px, 55vh) auto;
			grid-template-columns: 1fr;
			height: auto;
		}
		.main-area {
			padding: 0.8rem;
		}
		.right-sidebar {
			width: 100%;
			max-height: none;
			height: auto;
			border-left: none;
			border-top: 1px solid var(--overlay);
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
