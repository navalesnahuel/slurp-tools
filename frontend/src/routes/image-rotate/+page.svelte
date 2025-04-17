<!-- src/routes/image-rotate/+page.svelte -->
<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';

	// Import API functions (Rotate, Undo, Redo)
	import {
		API_BASE_URL,
		uploadImage,
		applyRotateFilter, // <<< CHANGED
		getRenderImage,
		undoChanges,
		redoChanges
	} from '$lib/services/imageApi.js';

	// --- State Variables ---
	let imageFile = null;
	let originalFilename = '';
	let imageUUID = null; // Current state UUID
	let imageUrl = ''; // Current state preview URL
	let isLoading = false;
	let errorMessage = '';
	let rotationAngle = 0; // <<< ADDED: State for rotation angle

	// --- Lifecycle Hooks ---
	onMount(() => {});
	onDestroy(() => {});

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
		if (!imageFile) return;
		isLoading = true;
		errorMessage = '';
		imageUrl = '';
		imageUUID = null;
		rotationAngle = 0; // Reset angle on new upload

		try {
			console.log('Uploading image for rotation:', originalFilename);
			const result = await uploadImage(imageFile);
			imageUUID = result.UUID;
			console.log('Upload successful, Initial UUID:', imageUUID);
			// No initial dimensions needed, just refresh the image preview
			refreshImage();
			imageFile = null;
		} catch (error) {
			console.error('Upload failed:', error);
			errorMessage = `Error uploading ${originalFilename || 'image'}: ${error.message}`;
			resetStateOnError();
		}
		// isLoading will be set false by refreshImage -> handleImageElementLoad
	}

	// --- Image Update ---
	function refreshImage() {
		if (!imageUUID) {
			console.warn('refreshImage called without UUID.');
			resetStateOnError();
			return;
		}
		console.log('Refreshing image preview for UUID:', imageUUID);
		isLoading = true;
		// Don't clear error message here, only on successful load or new user action error
		const newImageUrl = getRenderImage(imageUUID) + '?t=' + Date.now();
		imageUrl = newImageUrl;
		console.log('Image URL set for preview:', imageUrl);
	}

	// --- Image Element Handlers ---
	function handleImageElementLoad() {
		console.log('Image element finished loading src:', imageUrl);
		errorMessage = ''; // Clear error message on successful load
		isLoading = false;
	}

	function handleImageElementError() {
		console.error('Image element failed to load src:', imageUrl);
		if (!errorMessage) {
			// Don't overwrite specific errors (e.g., from apply)
			errorMessage = 'Error: Failed to load image preview.';
		}
		isLoading = false;
	}

	// --- Change Image ---
	function handleChangeImageClick() {
		if (isLoading) return;
		console.log('Change Image clicked.');
		errorMessage = ''; // Clear error when changing image
		resetStateOnError();
		const fileInput = document.getElementById('file-input');
		if (fileInput) {
			fileInput.click();
		} else {
			console.error('File input #file-input not found!');
		}
	}

	// --- Helper to reset state ---
	function resetStateOnError() {
		console.log('Resetting state...');
		imageFile = null;
		originalFilename = '';
		imageUUID = null;
		imageUrl = '';
		rotationAngle = 0;
		isLoading = false;
		// errorMessage is usually set *before* calling this
	}

	// --- Apply Rotate Filter --- <<< CHANGED
	async function handleApplyRotate() {
		if (!imageUUID || isLoading) {
			errorMessage = 'No image loaded or already processing.';
			return;
		}
		// Optional: You might want to prevent applying if angle is 0,
		// but allowing it might be simpler if the API handles it as a no-op.
		// if (rotationAngle === 0) {
		//     console.log("Rotation angle is 0, skipping apply.");
		//     return;
		// }

		isLoading = true;
		errorMessage = ''; // Clear previous errors before trying

		try {
			console.log(`Applying rotate filter (${rotationAngle} deg) to UUID: ${imageUUID}...`);
			// Use the applyRotate function
			await applyRotateFilter(imageUUID, rotationAngle);
			console.log('Rotate filter applied via API successfully.');
			refreshImage(); // Refresh the preview
		} catch (error) {
			console.error('Rotate failed:', error);
			errorMessage = `Error applying rotation: ${error.message}`;
			isLoading = false; // Stop loading on error
		}
		// isLoading will be set false by refreshImage -> handleImageElementLoad on success
	}

	// --- Undo ---
	async function handleUndo() {
		if (!imageUUID || isLoading) return;
		isLoading = true;
		// No errorMessage clear here, keep existing if any
		try {
			console.log('Requesting Undo for UUID:', imageUUID);
			await undoChanges(imageUUID);
			console.log('Undo successful via API.');
			refreshImage();
		} catch (error) {
			console.error('Undo failed (API error likely history related):', error.message);
			isLoading = false;
		}
	}

	// --- Redo ---
	async function handleRedo() {
		if (!imageUUID || isLoading) return;
		isLoading = true;
		// No errorMessage clear here
		try {
			console.log('Requesting Redo for UUID:', imageUUID);
			await redoChanges(imageUUID);
			console.log('Redo successful via API.');
			refreshImage();
		} catch (error) {
			console.error('Redo failed (API error likely history related):', error.message);
			isLoading = false;
		}
	}

	// --- Open Image in New Tab ---
	function handleOpenImage() {
		if (!imageUUID || !imageUrl || isLoading) return;
		console.log('Opening image in new tab for UUID:', imageUUID);
		const imageUrlToOpen = getRenderImage(imageUUID);
		const imageUrlWithTimestamp = `${imageUrlToOpen}${imageUrlToOpen.includes('?') ? '&' : '?'}t=${Date.now()}`;
		window.open(imageUrlWithTimestamp, '_blank');
		console.log('Image opened in new tab.');
	}

	// --- Helper Functions ---
	function truncateFilename(name, length = 25) {
		if (!name) return '';
		if (name.length <= length) return name;
		const extIndex = name.lastIndexOf('.');
		const ext = extIndex !== -1 ? name.substring(extIndex) : '';
		const base = extIndex !== -1 ? name.substring(0, extIndex) : name;
		const maxBaseLength = length - ext.length - 3;
		const truncatedBase = base.length > maxBaseLength ? base.substring(0, maxBaseLength) : base;
		return `${truncatedBase}...${ext}`;
	}

	// --- Reactive States for UI ---
	$: isImageLoaded = !!imageUUID && !!imageUrl; // Removed originalDimensions check
	$: canChange = !isLoading;
	$: canApply = isImageLoaded && !isLoading; // Can always apply if loaded (even 0 deg)
	$: canUndo = isImageLoaded && !isLoading;
	$: canRedo = isImageLoaded && !isLoading;
	$: canOpenImage = isImageLoaded && !isLoading;

	// --- Quick Rotate Buttons ---
	function setRotation(angle) {
		if (isLoading) return;
		rotationAngle = angle;
		// Optionally auto-apply on quick button click:
		// handleApplyRotate();
	}
</script>

<!-- HTML Structure -->
<svelte:head>
	<title>Image Rotator - Slurp Tools</title>
	<!-- Changed Title -->
</svelte:head>

<div class="editor-wrapper">
	<div class="page-container">
		{#if !imageUUID && !isLoading}
			<!-- Initial State -->
			<div class="initial-upload-state" transition:fade={{ duration: 200 }}>
				<h1>Image Rotator</h1>
				<!-- Changed Heading -->
				<p class="tool-description">Select an image to rotate it.</p>
				<!-- Changed Desc -->
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
			<!-- Loading State -->
			<div class="loading-state" transition:fade={{ duration: 200 }}>
				<div class="spinner"></div>
				{#if originalFilename && !imageUUID}
					<p>Uploading {truncateFilename(originalFilename, 30)}...</p>
				{:else if imageUUID && !imageUrl}
					<p>Loading image preview...</p>
				{:else}
					<p>Loading...</p>
				{/if}
				{#if errorMessage}<p class="error-message">{errorMessage}</p>{/if}
			</div>
		{:else}
			<!-- Editor Interface -->
			<div
				class="editor-interface"
				class:loading={isLoading && isImageLoaded}
				transition:fade={{ duration: 300 }}
			>
				<!-- Toolbar -->
				<div class="top-toolbar">
					<div class="toolbar-left">
						<span class="toolbar-label">Rotator</span>
						<!-- Changed Label -->
					</div>
					<div class="toolbar-right">
						<!-- Apply Button -->
						<button
							class="apply-button button-like toolbar-button"
							on:click={handleApplyRotate}
							disabled={!canApply}
						>
							{#if isLoading && canApply}<span class="button-spinner"></span> Applying...{:else}Apply
								Rotate{/if}
							<!-- Changed Text -->
						</button>
					</div>
				</div>

				<!-- Main Area -->
				<div class="main-area">
					{#if imageUrl}
						<div class="img-container">
							<img
								src={imageUrl}
								alt={originalFilename || 'Image to rotate'}
								class="preview-image"
								on:load={handleImageElementLoad}
								on:error={handleImageElementError}
								key={imageUrl}
							/>
						</div>
					{/if}
					{#if isLoading && isImageLoaded}
						<div class="main-area-overlay">
							<div class="spinner"></div>
							<p>Processing...</p>
						</div>
					{/if}
					{#if !imageUrl && !isLoading && imageUUID}
						<p class="placeholder-text error-message">Failed to load image preview.</p>
					{/if}
				</div>

				<!-- Sidebar -->
				<div class="right-sidebar">
					<!-- File Management -->
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

					<!-- Rotation Controls Section <<< REPLACED DETAILS SECTION >>> -->
					<div class="sidebar-section rotation-controls">
						<!-- Changed class -->
						<h4 class="h4-maroon">Rotation</h4>
						<!-- Changed Heading & Color -->
						<!-- Rotation Slider -->
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
									disabled={isLoading || !isImageLoaded}
								/>
								<span class="rotation-value">{rotationAngle}°</span>
							</div>
						</div>
						<!-- Quick Buttons -->
						<div class="control-item quick-rotate-buttons">
							<button
								class="button-like quick-button"
								on:click={() => setRotation(-90)}
								disabled={isLoading || !isImageLoaded}>-90°</button
							>
							<button
								class="button-like quick-button"
								on:click={() => setRotation(0)}
								disabled={isLoading || !isImageLoaded}>0°</button
							>
							<button
								class="button-like quick-button"
								on:click={() => setRotation(90)}
								disabled={isLoading || !isImageLoaded}>+90°</button
							>
							<button
								class="button-like quick-button"
								on:click={() => setRotation(180)}
								disabled={isLoading || !isImageLoaded}>180°</button
							>
						</div>
					</div>

					<!-- History Controls Section (Undo/Redo) -->
					<div class="sidebar-section controls">
						<h4 class="h4-teal">History</h4>
						<!-- Changed Heading -->
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

					<!-- Open Image Button Section -->
					<div class="sidebar-section download-section">
						<!-- Keeping class name for consistency -->
						<button
							on:click={handleOpenImage}
							class="button-like save-button"
							disabled={!canOpenImage}
						>
							Download Image
						</button>
					</div>

					<!-- Error Message -->
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

<!-- CSS Styles (Includes styles for new rotation elements) -->
<style>
	/* --- Layout Variables & Base --- */
	:root {
		--toolbar-height: 60px;
		--sidebar-width: 280px;
		--grid-size: 20px;
		--editor-v-margin: 3rem;
		--editor-fixed-height: calc(90vh - var(--editor-v-margin) - 1px);
	}
	/* ... (Global, editor-wrapper, page-container styles - no changes) ... */
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
		color: var(--subtext0);
		max-width: 400px;
		line-height: 1.5;
	}
	.loading-state p {
		margin-top: 1rem;
		color: var(--overlay);
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
	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

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

	/* --- Main Area --- */
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

	/* --- Right Sidebar --- */
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
	/* <<< NEW Section Color >>> */
	.sidebar-section.rotation-controls {
		background-color: var(--maroon);
	}
	.sidebar-section.controls {
		background-color: var(--teal);
	} /* History */
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
	/* Heading Colors */
	.h4-mauve {
		color: var(--mauve);
		border-bottom-color: var(--mauve) !important;
	}
	.h4-maroon {
		color: var(--maroon);
		border-bottom-color: var(--maroon) !important;
	} /* Adjusted color for heading */
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

	/* --- Specific Button Colors & Styles --- */
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
	} /* Style for Open Image */
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

	/* --- Sidebar Controls --- */
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
	.history-controls {
		display: flex;
		gap: 0.8rem;
		margin-top: 0;
		justify-content: space-between;
	}

	/* <<< NEW Rotation Styles >>> */
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
	}
	.rotation-value {
		font-size: 0.9rem;
		min-width: 45px;
		text-align: right;
		color: var(--text);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
	}
	.quick-rotate-buttons {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.quick-button {
		width: 100%; /* Override default button width */
		padding: 0.4rem 0.5rem;
		font-size: 0.8rem;
		background-color: var(--crust);
		color: var(--flamingo); /* Match section accent */
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
	}

	/* --- Error Message --- */
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

	/* --- Responsive Design --- */
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
			height: auto;
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
		.quick-rotate-buttons {
			grid-template-columns: repeat(4, 1fr);
		} /* Keep 4 across */
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
			max-height: none;
		}
		.quick-button {
			font-size: 0.75rem;
			padding: 0.3rem 0.4rem;
		}
		.rotation-slider-group .slider-container {
			flex-wrap: wrap;
		} /* Allow slider value to wrap */
		.rotation-value {
			min-width: 35px;
			text-align: center;
			flex-basis: 100%;
			margin-top: 0.3rem;
		}
	}
</style>
