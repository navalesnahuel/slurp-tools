<!-- src/routes/image-to-pdf/+page.svelte -->
<script>
	import { onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';

	import ImageEditorLayout from '../../components/ImageEditorLayout.svelte';
	import InitialUploadPrompt from '../../components/InitialUploadPrompt.svelte';
	import LoadingIndicator from '../../components/LoadingIndicator.svelte';
	import ErrorMessageDisplay from '../../components/ErrorMessageDisplay.svelte';
	import PdfPreviewItem from '../../components/PdfPreviewItem.svelte';

	import { imagesToPDF } from '$lib/services/imageApi.js';

	let imagePreviews = [];
	let nextId = 0;
	let isGeneratingPdf = false;
	let errorMessage = '';
	let isLoadingFiles = false;
	let fileInputRef;

	async function handleFileSelect(event) {
		const fileInput = event.target;
		const files = fileInput.files;
		if (!files || files.length === 0) return;

		isLoadingFiles = true;
		errorMessage = '';

		await new Promise((resolve) => setTimeout(resolve, 50));

		try {
			const newPreviews = [];
			for (const file of files) {
				if (!file.type.startsWith('image/')) {
					continue;
				}
				if (
					imagePreviews.some(
						(p) => p.file.name === file.name && p.file.size === file.size
					)
				) {
					continue;
				}
				const previewUrl = URL.createObjectURL(file);
				newPreviews.push({ id: nextId++, file: file, previewUrl: previewUrl });
			}
			imagePreviews = [...imagePreviews, ...newPreviews];
		} catch (error) {
			errorMessage = `Error loading images: ${error.message}`;
		} finally {
			isLoadingFiles = false;
			if (fileInput) fileInput.value = null;
		}
	}

	function triggerFileInput() {
		if (isLoadingFiles || isGeneratingPdf) return;
		fileInputRef?.click();
	}

	function handleRemoveImage(event) {
		if (isGeneratingPdf) return;
		const idToRemove = event.detail.id;
		const previewToRemove = imagePreviews.find((p) => p.id === idToRemove);
		if (previewToRemove?.previewUrl) {
			URL.revokeObjectURL(previewToRemove.previewUrl);
		}
		imagePreviews = imagePreviews.filter((preview) => preview.id !== idToRemove);
	}

	function handleMoveImage(event) {
		if (isGeneratingPdf) return;
		const { id, direction } = event.detail;
		const index = imagePreviews.findIndex((p) => p.id === id);
		if (index === -1) return;
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= imagePreviews.length) return;
		const newArray = [...imagePreviews];
		[newArray[index], newArray[newIndex]] = [newArray[newIndex], newArray[index]];
		imagePreviews = newArray;
	}

	function clearAllImages() {
		if (isGeneratingPdf || isLoadingFiles) return;
		imagePreviews.forEach((p) => {
			if (p.previewUrl) {
				URL.revokeObjectURL(p.previewUrl);
			}
		});
		imagePreviews = [];
		errorMessage = '';
	}

	async function handleGeneratePdf() {
		if (imagePreviews.length === 0 || isGeneratingPdf || isLoadingFiles) return;
		isGeneratingPdf = true;
		errorMessage = '';
		try {
			const filesToUpload = imagePreviews.map((p) => p.file);

			await imagesToPDF(filesToUpload);
		} catch (error) {
			errorMessage = `Error generating PDF: ${error.message || 'Unknown error'}`;
		} finally {
			isGeneratingPdf = false;
		}
	}

	onDestroy(() => {
		imagePreviews.forEach((p) => {
			if (p.previewUrl) {
				URL.revokeObjectURL(p.previewUrl);
			}
		});
	});

	$: hasImages = imagePreviews.length > 0;
	$: showInitialState = !hasImages && !isLoadingFiles;
	$: showEditor = hasImages || isLoadingFiles;
	$: canGeneratePdf = hasImages && !isGeneratingPdf && !isLoadingFiles;
	$: disableActions = isGeneratingPdf || isLoadingFiles;
</script>

<svelte:head>
	<title>Image to PDF Generator</title>
</svelte:head>

<ImageEditorLayout
	toolTitle="Image to PDF"
	toolDescription="Select images, order them, and generate a PDF."
	bind:isLoading={isLoadingFiles}
	bind:errorMessage
	bind:hasImage={showEditor}
>
	<div slot="toolbar-left">
		<span class="toolbar-label">PDF Generator</span>
	</div>
	<div slot="toolbar-right">
		<button
			class="button-like apply-button toolbar-button"
			on:click={handleGeneratePdf}
			disabled={!canGeneratePdf}
			title={canGeneratePdf
				? `Generate PDF with ${imagePreviews.length} image(s)`
				: 'Add images first or wait'}
		>
			{#if isGeneratingPdf}
				<span class="button-spinner"></span> Generating...
			{:else if isLoadingFiles && hasImages}
				<span class="button-spinner"></span> Loading...
			{:else}
				Generate PDF ({imagePreviews.length})
			{/if}
		</button>
	</div>

	<div slot="main-content" class="pdf-main-area">
		{#if isLoadingFiles && !hasImages}{:else if isLoadingFiles && hasImages}
			<div class="main-area-overlay">
				<div class="spinner"></div>
				<p>Adding images...</p>
			</div>
		{/if}

		{#if hasImages}
			<div class="preview-grid">
				{#each imagePreviews as preview, index (preview.id)}
					<PdfPreviewItem
						{preview}
						isFirst={index === 0}
						isLast={index === imagePreviews.length - 1}
						disabled={disableActions}
						on:remove={handleRemoveImage}
						on:move={handleMoveImage}
					/>
				{/each}
			</div>
		{:else if !isLoadingFiles}
			<p class="placeholder-text">No images selected yet. Click "Add More Images".</p>
		{/if}
	</div>

	<svelte:fragment slot="sidebar-content" let:openFilePickerIgnored>
		<div class="sidebar-section section-actions">
			<h4 class="h4-lavender">Manage Images</h4>
			<div class="sidebar-button-group">
				<button
					on:click={triggerFileInput}
					class="button-like add-more-button"
					disabled={disableActions}
				>
					Add More Images
				</button>
				<button
					on:click={clearAllImages}
					class="button-like clear-button"
					disabled={disableActions || !hasImages}
				>
					Clear All ({imagePreviews.length})
				</button>
			</div>
		</div>

		{#if errorMessage}
			<ErrorMessageDisplay message={errorMessage} context="sidebar" />
		{/if}
	</svelte:fragment>
</ImageEditorLayout>

<input
	type="file"
	bind:this={fileInputRef}
	id="file-input-pdf"
	accept="image/png, image/jpeg, image/webp, image/gif, image/bmp, image/tiff"
	on:change={handleFileSelect}
	style="display: none;"
	multiple
	disabled={isLoadingFiles || isGeneratingPdf}
/>

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

	.pdf-main-area {
		overflow-y: auto;
		height: 100%;
		padding: 1.2rem;
		box-sizing: border-box;
		position: relative;
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
	.spinner {
		border: 4px solid var(--surface1);
		border-top: 4px solid var(--blue);
		border-radius: 50%;
		width: 40px;
		height: 40px;
		animation: spin 1s linear infinite;
	}

	.preview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 1rem;
		width: 100%;
		padding-bottom: 1rem;
	}
	.placeholder-text {
		font-size: 0.9rem;
		color: var(--subtext0);
		text-align: center;
		padding: 1rem 0;
		margin-top: 1rem;
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

	.section-actions {
		background-color: var(--lavender);
		color: var(--crust);
	}
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
		background-color: var(--base);
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
	.add-more-button:disabled,
	.clear-button:disabled {
		background-color: var(--surface0) !important;
		color: var(--overlay) !important;
		border-color: var(--surface1) !important;
		opacity: 0.7;
		cursor: not-allowed;
		box-shadow: none;
		transform: none;
		filter: none;
	}

	.sidebar-error-container {
		margin-top: 0;
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

	@media (max-width: 900px) {
		.pdf-main-area {
			min-height: 250px;
			overflow-y: visible;
			padding: 0.8rem;
		}
		.preview-grid {
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		}
	}
	@media (max-width: 480px) {
		.preview-grid {
			grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
			gap: 0.6rem;
		}
	}
</style>
