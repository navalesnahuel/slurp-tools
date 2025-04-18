<!-- src/routes/resize/+page.svelte -->
<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { imageEditorStore } from '$lib/stores/imageEditorStore.js';
	import ImageEditorLayout from '../../components/ImageEditorLayout.svelte';
	import FileManagementSidebar from '../../components/FileManagementSidebar.svelte';
	import HistoryControlsSidebar from '../../components/HistoryControlsSidebar.svelte';
	import DownloadSidebar from '../../components/DownloadSidebar.svelte';
	import { applyResizeFilter } from '$lib/services/imageApi.js';
	// import { debounce } from '$lib/utils/helpers.js'; // Opcional para inputs

	// --- Constantes ---
	const MAX_DIMENSION = 5000; // Límite para dimensiones

	// --- Estado Local del Componente ---
	let targetWidth = '';
	let targetHeight = '';
	let keepAspectRatio = true;
	let isUpdatingProgrammatically = false; // Para evitar bucles en inputs
	let localErrorMessage = ''; // Para errores de validación locales

	// --- Suscripciones al Store ---
	let imageUUID, imageUrl, isLoading, isApplying, originalDimensions, storeErrorMessage;
	const unsubscribeStore = imageEditorStore.subscribe((state) => {
		imageUUID = state.imageUUID;
		imageUrl = state.imageUrl;
		isLoading = state.isLoading;
		isApplying = state.isApplying;
		storeErrorMessage = state.errorMessage; // Error general del store
		// Sincroniza originalDimensions si cambia en el store
		if (originalDimensions !== state.originalDimensions) {
			originalDimensions = state.originalDimensions;
			// Si hay dimensiones originales, inicializa/resetea los targets
			if (originalDimensions) {
				initializeTargetDimensions(originalDimensions.width, originalDimensions.height);
			} else {
				// Si se eliminan las dimensiones (ej. reset), limpia los inputs
				targetWidth = '';
				targetHeight = '';
			}
		}
	});

	// --- Inicialización/Sincronización de Inputs ---
	function initializeTargetDimensions(origW, origH) {
		if (!origW || !origH) return;
		isUpdatingProgrammatically = true; // Evita triggers iniciales
		console.log(`[ResizePage] Initializing targets from ${origW}x${origH}`);

		let w = Math.max(1, Math.min(origW, MAX_DIMENSION));
		let h = Math.max(1, Math.min(origH, MAX_DIMENSION));
		const ratio = origW / origH;

		// Si excede el límite y aspect ratio está bloqueado, recalcula
		if (keepAspectRatio && (origW > MAX_DIMENSION || origH > MAX_DIMENSION)) {
			if (w > h) {
				// Landscape or square exceeding max width
				w = MAX_DIMENSION;
				h = Math.max(1, Math.round(w / ratio));
				// Ensure height didn't exceed max after calculation
				h = Math.min(h, MAX_DIMENSION);
			} else {
				// Portrait exceeding max height
				h = MAX_DIMENSION;
				w = Math.max(1, Math.round(h * ratio));
				// Ensure width didn't exceed max after calculation
				w = Math.min(w, MAX_DIMENSION);
			}
		}
		// Asigna valores finales
		targetWidth = w;
		targetHeight = h;

		console.log(`[ResizePage] Initialized targets to ${targetWidth}x${targetHeight}`);
		tick().then(() => (isUpdatingProgrammatically = false));
	}

	// --- Handlers de Carga/Error de Imagen ---
	function handleImageLoad(event) {
		if (!event.target) return;
		const target = event.target;
		const dimensions = { width: target.naturalWidth, height: target.naturalHeight };
		console.log(
			`[ResizePage] handleImageLoad. Natural Dims: ${dimensions.width}x${dimensions.height}`
		);
		// Pasa dimensiones al store y completa carga
		imageEditorStore.imageLoadComplete(dimensions);
		// La suscripción al store detectará el cambio en originalDimensions y llamará a initializeTargetDimensions
	}

	function handleImageError() {
		console.error('[ResizePage] handleImageError: Image failed to load src:', imageUrl);
		imageEditorStore.imageLoadError('Error: Failed to load image preview.');
		targetWidth = ''; // Limpia inputs si la imagen falla
		targetHeight = '';
	}

	// --- Lógica de Actualización de Dimensiones ---
	function updateHeightFromWidth() {
		if (
			isUpdatingProgrammatically ||
			!keepAspectRatio ||
			!originalDimensions ||
			typeof targetWidth !== 'number' ||
			targetWidth <= 0
		)
			return;

		isUpdatingProgrammatically = true;
		localErrorMessage = ''; // Limpia error local
		let newWidth = Math.max(1, Math.min(targetWidth, MAX_DIMENSION)); // Clamp input
		if (newWidth !== targetWidth) targetWidth = newWidth; // Actualiza input si se clampa

		const ratio = originalDimensions.width / originalDimensions.height;
		if (isNaN(ratio) || ratio <= 0 || originalDimensions.height === 0) {
			tick().then(() => (isUpdatingProgrammatically = false));
			return;
		}

		const newHeight = Math.round(newWidth / ratio);
		const finalHeight = Math.max(1, Math.min(newHeight, MAX_DIMENSION)); // Clamp calculado

		if (targetHeight !== finalHeight) targetHeight = finalHeight;
		tick().then(() => (isUpdatingProgrammatically = false));
	}

	function updateWidthFromHeight() {
		if (
			isUpdatingProgrammatically ||
			!keepAspectRatio ||
			!originalDimensions ||
			typeof targetHeight !== 'number' ||
			targetHeight <= 0
		)
			return;

		isUpdatingProgrammatically = true;
		localErrorMessage = ''; // Limpia error local
		let newHeight = Math.max(1, Math.min(targetHeight, MAX_DIMENSION)); // Clamp input
		if (newHeight !== targetHeight) targetHeight = newHeight; // Actualiza input si se clampa

		const ratio = originalDimensions.width / originalDimensions.height;
		if (isNaN(ratio) || ratio <= 0) {
			tick().then(() => (isUpdatingProgrammatically = false));
			return;
		}
		const newWidth = Math.round(newHeight * ratio);
		const finalWidth = Math.max(1, Math.min(newWidth, MAX_DIMENSION)); // Clamp calculado

		if (targetWidth !== finalWidth) targetWidth = finalWidth;
		tick().then(() => (isUpdatingProgrammatically = false));
	}

	function handleKeepAspectRatioToggle() {
		// Si se activa, recalcula basado en el ancho (o alto si prefieres)
		if (keepAspectRatio) {
			updateHeightFromWidth();
		}
	}

	// --- Lógica para Aplicar Resize ---
	async function handleApplyResize() {
		localErrorMessage = ''; // Limpia error local
		const widthNum = Number(targetWidth);
		const heightNum = Number(targetHeight);

		// Validación
		if (!imageUUID || isLoading || isApplying) return;
		if (isNaN(widthNum) || isNaN(heightNum) || widthNum <= 0 || heightNum <= 0) {
			localErrorMessage = 'Please enter valid positive dimensions.';
			return;
		}
		if (widthNum > MAX_DIMENSION || heightNum > MAX_DIMENSION) {
			localErrorMessage = `Dimensions cannot exceed ${MAX_DIMENSION}px.`;
			return;
		}
		// Comprobación redundante por si acaso
		if (!originalDimensions) {
			localErrorMessage = 'Cannot apply resize: Original dimensions not loaded.';
			return;
		}

		// Llama a la acción del store para aplicar el filtro
		await imageEditorStore.applyFilter(
			(uuid) => applyResizeFilter(uuid, widthNum, heightNum),
			'Resize'
		);
		// El store maneja isLoading, isApplying y refresh
	}

	// --- Computaciones Reactivas ---
	$: isValidInput =
		typeof targetWidth === 'number' &&
		targetWidth > 0 &&
		targetWidth <= MAX_DIMENSION &&
		typeof targetHeight === 'number' &&
		targetHeight > 0 &&
		targetHeight <= MAX_DIMENSION;
	$: canApplyResize =
		!!imageUUID && !!originalDimensions && !isLoading && !isApplying && isValidInput;
	// Muestra error local o del store
	$: displayError = localErrorMessage || storeErrorMessage;

	// --- Lifecycle ---
	onDestroy(() => {
		unsubscribeStore();
		imageEditorStore.cleanupBlobUrl(); // Limpia blob si aplica
	});
</script>

<svelte:head>
	<title>Image Resizer - Slurp Tools</title>
</svelte:head>

<ImageEditorLayout toolTitle="Image Resizer" toolDescription="Select an image to resize it.">
	<div slot="toolbar-left">
		<span class="toolbar-label">Resizer</span>
	</div>

	<div slot="toolbar-right">
		<button
			class="apply-button button-like toolbar-button"
			on:click={handleApplyResize}
			disabled={!canApplyResize}
			title={canApplyResize ? 'Apply new dimensions' : 'Enter valid dimensions below'}
		>
			{#if isApplying}<span class="button-spinner"></span> Applying...{:else}Apply Resize{/if}
		</button>
	</div>

	<div slot="main-content" class="resize-main-content">
		{#if imageUrl}
			<div class="img-container">
				<img
					src={imageUrl}
					alt={$imageEditorStore.originalFilename || 'Image to resize'}
					key={imageUrl}
					class="preview-image"
					on:load={handleImageLoad}
					on:error={handleImageError}
					style:opacity={isLoading ? 0.5 : 1}
				/>
			</div>
		{:else if !isLoading}
			<p class="placeholder-text">Select an image to start.</p>
		{/if}
	</div>

	<svelte:fragment slot="sidebar-content" let:openFilePicker>
		<FileManagementSidebar on:openFilePicker={openFilePicker} />

		<!-- Sección específica de Resize -->
		<div class="sidebar-section section-resize">
			<h4 class="h4-pink">Resize Dimensions</h4>
			{#if originalDimensions}
				<p class="original-dims-info">
					Current: {originalDimensions.width} x {originalDimensions.height} px
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
							disabled={isLoading || isApplying || !originalDimensions}
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
							disabled={isLoading || isApplying || !originalDimensions}
							on:input={updateWidthFromHeight}
							placeholder="Height"
						/>
					</div>
				</div>
				<div class="aspect-toggle">
					<label title="Maintain aspect ratio when changing dimensions">
						<input
							type="checkbox"
							bind:checked={keepAspectRatio}
							disabled={isLoading || isApplying || !originalDimensions}
							on:change={handleKeepAspectRatioToggle}
						/>
						<span>Lock aspect ratio</span>
					</label>
				</div>
			{:else if imageUUID && isLoading}
				<p class="placeholder-text">Loading dimensions...</p>
			{:else}
				<p class="placeholder-text">Load an image to see dimensions.</p>
			{/if}
		</div>

		<HistoryControlsSidebar />
		<DownloadSidebar />

		<!-- Muestra error local o del store -->
		{#if displayError}
			<div class="sidebar-error-container">
				<p class="error-message sidebar-error">{displayError}</p>
			</div>
		{/if}
	</svelte:fragment>
</ImageEditorLayout>

<style>
	/* --- Estilos Toolbar y Main (similares a Crop) --- */
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

	.resize-main-content {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
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
		transition: opacity 0.2s ease-in-out;
	}
	.placeholder-text {
		font-size: 0.9rem;
		color: var(--subtext0);
		text-align: center;
		padding: 1rem 0;
	}

	/* --- Estilos Sidebar Específicos de Resize --- */
	.sidebar-section {
		padding: 1.2rem 1.5rem;
		border-radius: 10px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
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

	.section-resize {
		background-color: var(--maroon); /* Fondo Rosa */
		color: var(--text); /* Texto oscuro */
	}
	.section-resize h4 {
		color: var(--text); /* Texto oscuro para el título */
		border-bottom-color: color-mix(in srgb, var(--base) 30%, transparent);
	}
	.original-dims-info {
		font-size: 0.8rem;
		color: color-mix(
			in srgb,
			var(--text) 80%,
			transparent
		); /* Texto oscuro pero menos énfasis */
		margin-bottom: 1rem;
		text-align: center;
		background: color-mix(in srgb, var(--text) 10%, transparent); /* Fondo muy sutil oscuro */
		padding: 0.3rem 0.6rem;
		border-radius: 3px;
	}
	.dimension-inputs {
		display: flex;
		gap: 1rem;
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
	}
	.input-group input[type='number'] {
		width: 100%;
		padding: 0.5rem 0.8rem;
		border: 1px solid var(--overlay);
		border-radius: 6px;
		font-size: 0.9rem;
		background-color: var(--base);
		color: var(--text); /* Texto claro en input oscuro */
		box-sizing: border-box;
		appearance: textfield;
	}
	.input-group input[type='number']::-webkit-outer-spin-button,
	.input-group input[type='number']::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.input-group input:focus {
		outline: none;
		border-color: var(--mauve);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--mauve) 30%, transparent);
	}
	.input-group input:disabled {
		background-color: var(--surface1);
		opacity: 0.7;
		cursor: not-allowed;
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
		color: var(--text);
	}
	.aspect-toggle input[type='checkbox'] {
		accent-color: var(--mauve);
		cursor: pointer;
		width: 16px;
		height: 16px;
	}
	.aspect-toggle input[type='checkbox']:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
	.placeholder-text {
		color: color-mix(in srgb, var(--base) 70%, transparent);
	} /* Placeholder dentro de sección */

	/* Estilo para contenedor de error */
	.sidebar-error-container {
		margin-top: 0;
	} /* Sin margen extra si está al final */
	.error-message.sidebar-error {
		margin: 0;
		width: 100%;
		box-sizing: border-box;
		text-align: left;
		background-color: color-mix(in srgb, var(--red) 20%, transparent);
		color: var(--text);
		border: 1px solid var(--red);
		border-radius: 6px;
		padding: 0.6rem 1rem;
		font-size: 0.85rem;
	}
</style>
