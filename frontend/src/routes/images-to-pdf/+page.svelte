<!-- src/routes/pdf-generator/+page.svelte -->
<script>
	import { onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';

	// Import API functions
	import { imagesToPDF } from '$lib/services/imageApi.js'; // Adjust path if needed

	// --- State Variables ---
	let imagePreviews = []; // Array to hold { id: number, file: File, previewUrl: string }
	let nextId = 0; // Simple ID generator for previews
	let isGeneratingPdf = false;
	let errorMessage = '';
	let isLoadingFiles = false; // Added state for file loading indication

	// --- File Selection & Preview Generation ---
	async function handleFileSelect(event) {
		const fileInput = event.target;
		const files = fileInput.files;
		if (!files || files.length === 0) return;

		isLoadingFiles = true; // Start loading indicator
		errorMessage = ''; // Clear previous errors
		await new Promise((resolve) => setTimeout(resolve, 50)); // Allow UI to update

		try {
			const newPreviews = [];
			for (const file of files) {
				if (!file.type.startsWith('image/')) {
					console.warn(`Skipping non-image file: ${file.name}`);
					continue;
				}
				if (
					imagePreviews.some(
						(p) => p.file.name === file.name && p.file.size === file.size
					)
				) {
					console.warn(`Skipping duplicate file: ${file.name}`);
					continue;
				}

				const previewUrl = URL.createObjectURL(file);
				newPreviews.push({
					id: nextId++,
					file: file,
					previewUrl: previewUrl
				});
			}

			// Batch update state
			imagePreviews = [...imagePreviews, ...newPreviews];
		} catch (error) {
			console.error('Error processing files:', error);
			errorMessage = `Error loading images: ${error.message}`;
		} finally {
			isLoadingFiles = false; // Stop loading indicator
			// Clear the input value
			fileInput.value = null;
		}
	}

	// --- Remove Image ---
	function removeImage(idToRemove) {
		if (isGeneratingPdf) return;
		const previewToRemove = imagePreviews.find((p) => p.id === idToRemove);
		if (previewToRemove?.previewUrl) {
			URL.revokeObjectURL(previewToRemove.previewUrl);
		}
		imagePreviews = imagePreviews.filter((preview) => preview.id !== idToRemove);
	}

	// --- Reorder Images ---
	function moveImage(id, direction) {
		if (isGeneratingPdf) return;
		const index = imagePreviews.findIndex((p) => p.id === id);
		if (index === -1) return;

		const newIndex = direction === 'up' ? index - 1 : index + 1;

		if (newIndex < 0 || newIndex >= imagePreviews.length) return;

		const newArray = [...imagePreviews];
		[newArray[index], newArray[newIndex]] = [newArray[newIndex], newArray[index]];
		imagePreviews = newArray;
	}

	// --- Generate PDF ---
	async function handleGeneratePdf() {
		if (imagePreviews.length === 0 || isGeneratingPdf) return;

		isGeneratingPdf = true;
		errorMessage = '';

		try {
			const filesToUpload = imagePreviews.map((p) => p.file);
			console.log(`Sending ${filesToUpload.length} images to generate PDF...`);
			await imagesToPDF(filesToUpload);
			console.log('PDF generation request successful.');
		} catch (error) {
			console.error('PDF Generation failed:', error);
			errorMessage = `Error generating PDF: ${error.message || 'Unknown error'}`;
		} finally {
			isGeneratingPdf = false;
		}
	}

	// --- Clear All Images ---
	function clearAllImages() {
		if (isGeneratingPdf) return;
		imagePreviews.forEach((p) => {
			if (p.previewUrl) {
				URL.revokeObjectURL(p.previewUrl);
			}
		});
		imagePreviews = [];
		errorMessage = '';
	}

	// --- Lifecycle Hook for Cleanup ---
	onDestroy(() => {
		console.log('Cleaning up object URLs...');
		imagePreviews.forEach((p) => {
			if (p.previewUrl) {
				URL.revokeObjectURL(p.previewUrl);
			}
		});
	});

	// --- Reactive States for UI ---
	$: canGeneratePdf = imagePreviews.length > 0 && !isGeneratingPdf && !isLoadingFiles;
	$: showInitialState = imagePreviews.length === 0 && !isLoadingFiles;
	$: showEditor = imagePreviews.length > 0 || isLoadingFiles;
	$: disableActions = isGeneratingPdf || isLoadingFiles;
</script>

<svelte:head>
	<title>Image to PDF Generator</title>
</svelte:head>

<div class="editor-wrapper">
	<div class="page-container">
		{#if showInitialState}
			<!-- Initial State - Styled like Scanner Reference -->
			<div class="initial-upload-state" transition:fade={{ duration: 200 }}>
				<h1>Image to PDF</h1>
				<p class="tool-description">
					Select one or more images. They will appear below, ready to be ordered and
					converted into a single PDF document.
				</p>
				<div class="input-area file-input-section">
					<!-- Button styled like the reference -->
					<label for="file-input" class="file-label scanner-style-button">
						<!-- REMOVED .button-like here -->
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
						Open Images
					</label>
				</div>
				{#if errorMessage}<p class="error-message">{errorMessage}</p>{/if}
			</div>
		{:else if isLoadingFiles && imagePreviews.length === 0}
			<!-- Loading State (Initial Load) -->
			<div class="loading-state" transition:fade={{ duration: 200 }}>
				<div class="spinner"></div>
				<p>Loading selected images...</p>
				{#if errorMessage}<p class="error-message">{errorMessage}</p>{/if}
			</div>
		{:else}
			<!-- Editor Interface -->
			<div class="editor-interface" transition:fade={{ duration: 300 }}>
				<!-- Toolbar -->
				<div class="top-toolbar">
					<div class="toolbar-left">
						<span class="toolbar-label">PDF Generator</span>
					</div>
					<div class="toolbar-right">
						<button
							class="button-like apply-button toolbar-button"
							on:click={handleGeneratePdf}
							disabled={!canGeneratePdf}
							title={canGeneratePdf
								? `Generate PDF with ${imagePreviews.length} image(s)`
								: imagePreviews.length === 0
									? 'Add images first'
									: 'Processing...'}
						>
							{#if isGeneratingPdf}
								<span class="button-spinner"></span> Generating...
							{:else if isLoadingFiles}
								<span class="button-spinner"></span> Loading...
							{:else}
								Generate PDF ({imagePreviews.length})
							{/if}
						</button>
					</div>
				</div>

				<!-- Main Area -->
				<div class="main-area pdf-main-area">
					{#if isLoadingFiles && imagePreviews.length > 0}
						<div class="main-area-overlay">
							<div class="spinner"></div>
							<p>Adding images...</p>
						</div>
					{/if}
					<div class="preview-grid">
						{#each imagePreviews as preview (preview.id)}
							<div class="preview-item">
								<img
									src={preview.previewUrl}
									alt={preview.file.name}
									title={preview.file.name}
									class="preview-thumbnail"
								/>
								<p class="preview-filename" title={preview.file.name}>
									{preview.file.name.length > 20
										? preview.file.name.substring(0, 18) + '...'
										: preview.file.name}
								</p>
								<div class="preview-controls">
									<button
										class="control-button move-button"
										title="Move Up"
										on:click={() => moveImage(preview.id, 'up')}
										disabled={imagePreviews[0].id === preview.id ||
											disableActions}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											fill="currentColor"
											viewBox="0 0 16 16"
											><path
												fill-rule="evenodd"
												d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5"
											/></svg
										>
									</button>
									<button
										class="control-button move-button"
										title="Move Down"
										on:click={() => moveImage(preview.id, 'down')}
										disabled={imagePreviews[imagePreviews.length - 1].id ===
											preview.id || disableActions}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											fill="currentColor"
											viewBox="0 0 16 16"
											><path
												fill-rule="evenodd"
												d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1"
											/></svg
										>
									</button>
									<button
										class="control-button remove-button"
										title="Remove Image"
										on:click={() => removeImage(preview.id)}
										disabled={disableActions}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											fill="currentColor"
											viewBox="0 0 16 16"
											><path
												d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"
											/><path
												d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"
											/></svg
										>
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Sidebar -->
				<div class="right-sidebar">
					<div class="sidebar-section file-actions">
						<h4 class="h4-lavender">Manage Images</h4>
						<div class="sidebar-button-group">
							<label
								for="file-input"
								class="button-like add-more-button"
								class:disabled={disableActions}
							>
								Add More Images
							</label>
							<button
								class="button-like clear-button"
								on:click={clearAllImages}
								disabled={disableActions || imagePreviews.length === 0}
							>
								Clear All ({imagePreviews.length})
							</button>
						</div>
					</div>
					{#if errorMessage}
						<p class="error-message sidebar-error">{errorMessage}</p>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Hidden File Input -->
		<input
			type="file"
			id="file-input"
			accept="image/png, image/jpeg, image/webp, image/gif, image/bmp, image/tiff"
			on:change={handleFileSelect}
			style="display: none;"
			multiple
			disabled={isLoadingFiles || isGeneratingPdf}
		/>
	</div>
</div>

<!-- CSS Styles -->
<style>
	/* --- Layout Variables --- */
	:root {
		--toolbar-height: 60px;
		--sidebar-width: 280px;
		--grid-size: 20px;
		--editor-v-margin: 2rem;
		--editor-fixed-height: calc(85vh - var(--editor-v-margin));

		--h4-lavender-bg: var(--lavender);
		--h4-teal-bg: var(--teal);
		--h4-mauve-bg: var(--mauve);
	}

	/* --- Global Styles --- */
	:global(html, body) {
		height: 100%;
		margin: 0;
		padding: 0;
		background-color: var(--mantle);
		color-scheme: dark;
	}

	.editor-wrapper {
		max-width: 1400px;
		margin: var(--editor-v-margin) auto;
		padding: 0 1rem;
		box-sizing: border-box;
		display: flex;
	}

	.page-container {
		margin: 0 auto;
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

	/* --- Initial State & Loading State --- */
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
		border-radius: 12px;
		height: 100%;
		min-height: 400px;
	}
	.initial-upload-state h1 {
		margin-bottom: 1rem;
		font-family: var(--font-header);
		color: var(--text);
		font-weight: 500;
		font-size: 1.8rem;
	}
	.tool-description {
		margin-bottom: 2rem;
		color: var(--subtext0);
		max-width: 480px;
		line-height: 1.6;
		font-size: 0.95rem;
	}
	.loading-state p {
		margin-top: 1rem;
		color: var(--overlay);
	}
	.input-area.file-input-section {
		margin-bottom: 1rem;
	}

	/* --- Scanner Style Button for Initial Upload (TARGET STYLE - Corrected) --- */
	.initial-upload-state .scanner-style-button {
		/* Base Interactive Styling */
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		user-select: none;
		text-align: center;
		line-height: 1.3;
		border-radius: 8px; /* Match general button */
		gap: 0; /* Override default button gap */

		/* Size & Padding */
		width: auto;
		min-width: 220px;
		max-width: 280px;
		padding: 0.9rem 2rem;

		/* Font */
		font-family: var(--font-body); /* Inherit font */
		font-weight: 500;
		font-size: 0.95rem; /* Match general button */

		/* Appearance */
		background-color: var(--mantle);
		color: var(--base);
		border: 2px dashed var(--base);
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);

		/* Transitions */
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease,
			color 0.2s ease,
			box-shadow 0.2s ease,
			transform 0.15s ease;
	}
	.initial-upload-state .scanner-style-button:hover {
		background-color: var(--mantle);
		border-color: var(--blue);
		color: var(--blue);
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
		transform: translateY(-2px);
	}
	/* --- General Button Styles (Base for other buttons) --- */
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
			box-shadow 0.2s ease,
			opacity 0.2s ease,
			border-color 0.2s ease;
		text-decoration: none;
		line-height: 1.2;
		gap: 0.5rem;
		user-select: none;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		box-sizing: border-box;
	}
	/* Combined disabled styling */
	.button-like:disabled,
	.button-like.disabled {
		opacity: 0.6;
		cursor: not-allowed !important;
		pointer-events: auto !important; /* Allows title hover */
		box-shadow: none !important;
		transform: none !important;
		filter: grayscale(30%);
	}
	.button-like:not(:disabled):not(.disabled):hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
		filter: brightness(1.1);
	}
	.button-like:active:not(:disabled):not(.disabled) {
		transform: translateY(0px);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		filter: brightness(0.95);
	}
	.apply-button {
		background-color: var(--green);
		color: var(--crust);
	}
	.apply-button:disabled {
		background-color: var(--surface1);
		color: var(--overlay);
		filter: grayscale(50%);
	}

	/* --- Editor Interface Grid --- */
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

	/* --- Toolbar --- */
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
		font-size: 1rem;
		color: var(--text);
		font-weight: 600;
		font-family: var(--font-header);
	}
	.toolbar-button {
		width: auto !important;
		flex-shrink: 0;
	}

	/* --- Main Area --- */
	.main-area {
		grid-area: main;
		overflow: hidden;
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 0;
		box-sizing: border-box;
		background-color: var(--base);
		background-image:
			repeating-linear-gradient(
				rgba(108, 112, 134, 0.1) 0 1px,
				transparent 1px var(--grid-size)
			),
			repeating-linear-gradient(
				90deg,
				rgba(108, 112, 134, 0.1) 0 1px,
				transparent 1px var(--grid-size)
			);
		background-size: var(--grid-size) var(--grid-size);
	}
	.pdf-main-area {
		overflow-y: auto;
		height: 100%;
		padding: 1.2rem;
		box-sizing: border-box;
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
		pointer-events: none;
	}
	.main-area-overlay p {
		margin-top: 1rem;
		font-weight: 500;
	}

	/* --- Preview Grid & Items --- */
	.preview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 1rem;
		width: 100%;
		padding-bottom: 1rem;
	}
	.preview-item {
		background-color: var(--mantle);
		border-radius: 8px;
		padding: 0.7rem;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		position: relative;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
		border: 1px solid var(--surface0);
	}
	.preview-item:hover {
		transform: translateY(-3px);
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.15);
		border-color: var(--surface1);
	}
	.preview-thumbnail {
		width: 100%;
		height: 100px;
		object-fit: cover;
		border-radius: 4px;
		margin-bottom: 0.5rem;
		background-color: var(--surface0);
		border: 1px solid var(--overlay);
	}
	.preview-filename {
		font-size: 0.75rem;
		color: var(--subtext1);
		margin-bottom: 0.5rem;
		word-break: break-all;
		line-height: 1.3;
		height: 2.6em;
		overflow: hidden;
	}
	.preview-controls {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
		width: 100%;
		margin-top: auto;
		padding-top: 0.4rem;
	}
	.control-button {
		background: var(--surface1);
		border: none;
		color: var(--text);
		border-radius: 5px;
		padding: 0.3rem 0.4rem;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			color 0.2s ease;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}
	.control-button svg {
		width: 1em;
		height: 1em;
	}
	.control-button:hover:not(:disabled) {
		background-color: var(--surface2);
	}
	.control-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background-color: var(--surface0);
		color: var(--overlay);
	}
	.remove-button:hover:not(:disabled) {
		background-color: var(--red);
		color: var(--base);
	}
	.move-button:hover:not(:disabled) {
		background-color: var(--blue);
		color: var(--base);
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
		background-color: var(--mantle);
	}
	.sidebar-section.file-actions {
		background-color: var(--h4-lavender-bg);
	}
	.sidebar-section h4 {
		font-family: var(--font-header);
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		padding-bottom: 0.6rem;
		color: var(--crust);
		border-bottom: 1px solid color-mix(in srgb, var(--crust) 40%, transparent);
	}
	.h4-lavender {
	}

	/* --- Sidebar Buttons --- */
	.sidebar-button-group {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.sidebar-section .button-like {
		width: 100%;
		box-sizing: border-box;
		margin: 0;
		justify-content: center;
		padding: 0.6rem 1rem;
		font-size: 0.9rem;
		font-weight: 500;
	}
	.add-more-button {
		background-color: var(--crust);
		color: var(--lavender);
		border: 1px solid var(--surface2);
	}
	.add-more-button:hover:not(.disabled) {
		background-color: var(--surface0);
		border-color: var(--lavender);
	}
	.clear-button {
		background-color: var(--surface1);
		color: var(--subtext1);
		border: 1px solid var(--surface2);
	}
	.clear-button:hover:not(:disabled) {
		background-color: var(--red);
		color: var(--crust);
		border-color: var(--red);
	}
	.add-more-button.disabled,
	.clear-button:disabled {
		background-color: var(--surface0);
		color: var(--overlay);
		border-color: var(--surface1);
		opacity: 0.7;
		cursor: not-allowed;
		box-shadow: none;
		transform: none;
		filter: none;
	}

	/* --- Error Message --- */
	.error-message {
		background-color: color-mix(in srgb, var(--red) 20%, var(--mantle));
		color: var(--red);
		border: 1px solid var(--red);
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
		background-color: color-mix(in srgb, var(--red) 25%, var(--mantle));
		color: var(--text);
		border-color: var(--red);
		max-width: 100%;
		font-size: 0.85rem;
	}

	/* --- Loading Indicators --- */
	.spinner {
		border: 4px solid var(--surface1);
		border-top: 4px solid var(--blue);
		border-radius: 50%;
		width: 40px;
		height: 40px;
		animation: spin 1s linear infinite;
	}
	.button-spinner {
		border: 2px solid color-mix(in srgb, currentColor 50%, transparent);
		border-top: 2px solid currentColor;
		border-radius: 50%;
		width: 1em;
		height: 1em;
		animation: spin 0.8s linear infinite;
		display: inline-block;
		vertical-align: -0.15em;
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

	/* --- Responsive Design --- */
	@media (max-width: 900px) {
		:root {
			--editor-v-margin: 0;
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
			grid-template-rows: var(--toolbar-height) auto auto;
			grid-template-columns: 1fr;
			overflow: visible;
			height: auto;
		}
		.main-area {
			min-height: 250px;
			overflow: visible;
		}
		.pdf-main-area {
			overflow-y: visible;
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
		.top-toolbar {
			padding: 0 1rem;
		}
		.toolbar-label {
			display: none;
		}
		.preview-grid {
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		}
	}
	@media (max-width: 480px) {
		:root {
			--toolbar-height: 50px;
			--grid-size: 15px;
		}
		.initial-upload-state h1 {
			font-size: 1.5rem;
		}
		.tool-description {
			max-width: 90%;
			font-size: 0.9rem;
		}
		.initial-upload-state .scanner-style-button {
			min-width: 180px;
			padding: 0.8rem 1.5rem;
		}
		.preview-grid {
			grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
			gap: 0.6rem;
		}
		.button-like {
			/* General button size adjust */
			font-size: 0.9rem;
			padding: 0.6rem 1rem;
		}
		.sidebar-section .button-like {
			/* Sidebar button size adjust */
			font-size: 0.85rem;
		}
		.toolbar-button {
			/* Toolbar button size adjust */
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
		.error-message {
			max-width: 95%;
			font-size: 0.85rem;
		}
	}
</style>
