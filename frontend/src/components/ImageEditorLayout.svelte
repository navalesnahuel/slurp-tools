<!-- src/lib/components/ImageEditorLayout.svelte -->
<script>
	import { fade } from 'svelte/transition';
	import { imageEditorStore } from '$lib/stores/imageEditorStore.js';
	import InitialUploadPrompt from './InitialUploadPrompt.svelte';
	import LoadingIndicator from './LoadingIndicator.svelte';
	import ErrorMessageDisplay from './ErrorMessageDisplay.svelte';

	export let toolTitle = 'Image Editor';

	export let toolDescription = 'Select an image to start editing.';

	let fileInputRef;

	$: isLoading = $imageEditorStore.isLoading;
	$: isApplying = $imageEditorStore.isApplying;
	$: loadingStep = $imageEditorStore.loadingStep;
	$: errorMessage = $imageEditorStore.errorMessage;
	$: hasImage = !!$imageEditorStore.imageUUID || !!$imageEditorStore.imageUrl;

	function triggerFileInput() {
		fileInputRef?.click();
	}

	function handleFileSelected(event) {
		const file = event.target?.files?.[0];
		if (file) {
			imageEditorStore.selectAndUpload(file);
		}

		if (event.target) event.target.value = null;
	}

	function openFilePicker() {
		triggerFileInput();
	}
</script>

<div class="editor-layout-wrapper">
	<div class="page-container">
		{#if !hasImage && !isLoading}
			<InitialUploadPrompt
				title={toolTitle}
				description={toolDescription}
				{errorMessage}
				on:open={triggerFileInput}
			/>
		{:else if isLoading && (!hasImage || !$imageEditorStore.imageUrl)}
			<LoadingIndicator message={loadingStep || 'Loading...'} {errorMessage} />
		{:else}
			<div
				class="editor-interface"
				class:loading={isLoading}
				transition:fade={{ duration: 300 }}
			>
				<div class="top-toolbar">
					<div class="toolbar-left">
						<slot name="toolbar-left" {openFilePicker}></slot>
					</div>
					<div class="toolbar-right">
						<slot name="toolbar-right" {openFilePicker}></slot>
					</div>
				</div>

				<div class="main-area">
					<slot name="main-content"></slot>
					{#if isLoading && hasImage && $imageEditorStore.imageUrl}
						<div class="main-area-overlay">
							<div class="spinner"></div>
							{#if loadingStep}<p>{loadingStep}</p>{/if}
						</div>
					{/if}
				</div>

				<div class="right-sidebar">
					<slot name="sidebar-content" {openFilePicker}></slot>
					{#if errorMessage}
						<ErrorMessageDisplay message={errorMessage} context="sidebar" />
					{/if}
				</div>
			</div>
		{/if}

		<input
			type="file"
			bind:this={fileInputRef}
			accept="image/png, image/jpeg, image/webp, image/gif"
			on:change={handleFileSelected}
			style="display: none;"
			disabled={isLoading}
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

	.editor-layout-wrapper {
		max-width: 1400px;
		margin: calc(var(--editor-v-margin) / 2) auto;
		padding: 0 1rem;
		box-sizing: border-box;
		display: flex;
		width: 100%;
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

	.main-area-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: color-mix(in srgb, var(--base) 75%, transparent);
		backdrop-filter: blur(2px);
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
		background: var(--mantle);
		color: var(--base);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
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

	.spinner {
		border: 4px solid var(--surface1);
		border-top: 4px solid var(--blue);
		border-radius: 50%;
		width: 40px;
		height: 40px;
		animation: spin 1s linear infinite;
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
			--editor-v-margin: 0;
			--editor-fixed-height: auto;
			--sidebar-width: 100%;
		}
		.editor-layout-wrapper {
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
			height: auto;
		}
		.main-area {
			padding: 0.8rem;
			min-height: 300px;
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
		}
		.top-toolbar {
			padding: 0 1rem;
		}
	}

	@media (max-width: 480px) {
		:root {
			--toolbar-height: 50px;
			--grid-size: 15px;
		}
		.main-area {
			padding: 0.5rem;
		}
		.right-sidebar {
			padding: 1rem;
			gap: 1rem;
		}
		.top-toolbar {
			padding: 0 0.8rem;
		}
		.toolbar-left,
		.toolbar-right {
			gap: 0.5rem;
		}
	}
</style>
