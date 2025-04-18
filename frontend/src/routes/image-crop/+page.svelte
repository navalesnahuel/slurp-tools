<!-- src/routes/crop/+page.svelte -->
<script>
	import { onMount, onDestroy, tick } from 'svelte';
	import { imageEditorStore } from '$lib/stores/imageEditorStore.js';
	import ImageEditorLayout from '../../components/ImageEditorLayout.svelte';
	import FileManagementSidebar from '../../components/FileManagementSidebar.svelte';
	import HistoryControlsSidebar from '../../components/HistoryControlsSidebar.svelte';
	import DownloadSidebar from '../../components/DownloadSidebar.svelte';
	import { loadCropperAssetsIfNeeded, destroyCropperInstance } from '$lib/utils/cropperUtils.js';
	import { applyCropFilter } from '$lib/services/imageApi.js';

	// --- Component State specific to Cropper ---
	let imageElement = null; // bind:this
	let cropperInstance = null; // <<< Variable local para la instancia
	let zoom = 100;
	let initialZoomRatio = 1;
	let isUpdatingFromSlider = false;
	let aspect = NaN;
	let aspectRatioLabel = 'Free';
	let croppedAreaPixels = null;

	// --- Store Subscriptions ---
	let imageUUID, imageUrl, isLoading, isApplying, errorMessage;
	const unsubscribeStore = imageEditorStore.subscribe((state) => {
		// Solo actualiza si el valor del store es diferente
		let shouldReinitCropper = false;
		if (imageUrl !== state.imageUrl && state.imageUrl) {
			// Si la URL cambia a una nueva imagen válida, necesitamos reinit.
			// El 'on:load' se encargará de llamar a initializeCropper eventualmente.
			// Pero SIEMPRE destruimos la instancia vieja si la URL cambia.
			console.log('[CropPage] ImageURL changed in store. Destroying old Cropper if exists.');
			cropperInstance = destroyCropperInstance(cropperInstance);
			croppedAreaPixels = null; // Limpia datos viejos
			imageUrl = state.imageUrl; // Actualiza la URL local
		} else if (!state.imageUrl && cropperInstance) {
			// Si la URL se limpia (reset), destruye cropper
			console.log('[CropPage] Image URL cleared in store. Destroying Cropper.');
			cropperInstance = destroyCropperInstance(cropperInstance);
			croppedAreaPixels = null;
			imageUrl = state.imageUrl; // Actualiza URL local a vacía
		}

		// Actualiza otros estados
		if (imageUUID !== state.imageUUID) imageUUID = state.imageUUID;
		if (isLoading !== state.isLoading) isLoading = state.isLoading;
		if (isApplying !== state.isApplying) isApplying = state.isApplying;
		if (errorMessage !== state.errorMessage) errorMessage = state.errorMessage;
	});

	// --- Image Load/Error Handlers ---
	async function handleImageLoad(event) {
		// Marcar como async
		if (!event.target) return;
		const target = event.target;
		const dimensions = { width: target.naturalWidth, height: target.naturalHeight };
		console.log(
			`[CropPage] handleImageLoad: Image loaded successfully. Natural Dims: ${dimensions.width}x${dimensions.height}`
		);

		// 1. Señala al store que la carga terminó y pasa las dimensiones
		imageEditorStore.imageLoadComplete(dimensions);

		// 2. Destruye explícitamente CUALQUIER instancia vieja de cropper ANTES de reintentar.
		// Esto es crucial después de Undo/Redo.
		console.log(
			'[CropPage] handleImageLoad: Destroying potentially existing Cropper instance...'
		);
		cropperInstance = destroyCropperInstance(cropperInstance); // Asegura que la variable local se resetee a null
		croppedAreaPixels = null; // Limpia los datos de selección viejos

		// 3. Intenta inicializar Cropper (asegúrate de que los assets estén cargados)
		try {
			await loadCropperAssetsIfNeeded();
			await tick(); // Espera que el DOM se actualice
			initializeCropper(); // Ahora debería poder inicializar porque cropperInstance es null
		} catch (err) {
			console.error(
				'[CropPage] Cropper asset loading/initialization failed after image load:',
				err
			);
			imageEditorStore.imageLoadError(`Failed to load cropping library: ${err.message}`);
		}
	}

	function handleImageError() {
		console.error('[CropPage] handleImageError: Image failed to load src:', imageUrl);
		imageEditorStore.imageLoadError('Error: Failed to load image preview.');
		cropperInstance = destroyCropperInstance(cropperInstance); // Asegura limpiar si falla la carga
	}

	// --- Cropper Logic ---
	async function initializeCropper() {
		// Revisa condiciones OTRA VEZ por si el estado cambió mientras esperábamos tick/assets
		if (
			!imageElement ||
			!imageUrl ||
			!imageUUID ||
			cropperInstance ||
			typeof Cropper === 'undefined' ||
			isLoading ||
			isApplying
		) {
			console.warn(
				'[CropPage] Cropper init skipped (inside initializeCropper). Conditions:',
				{
					/*...*/
				}
			);
			return;
		}

		console.log('[CropPage] Initializing Cropper (inside initializeCropper)...');
		// No necesitamos tick aquí porque ya esperamos en handleImageLoad

		if (
			imageElement &&
			typeof Cropper !== 'undefined' &&
			!cropperInstance &&
			!isLoading &&
			!isApplying
		) {
			try {
				// No es necesario ocultar/mostrar opacidad si el flujo es correcto
				cropperInstance = new Cropper(imageElement, {
					// ... (mismas opciones de configuración de Cropper que antes) ...
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
					modal: false,
					crop: updateCropDataFromEvent,
					zoom: updateSliderFromCropper,
					ready: () => {
						console.log('[CropPage] Cropper ready.');
						const canvasData = cropperInstance.getCanvasData();
						const imgData = cropperInstance.getImageData();
						initialZoomRatio =
							imgData.naturalWidth > 0 ? canvasData.width / imgData.naturalWidth : 1;
						zoom = 100;
						updateCropData(); // Obtiene datos iniciales
					}
				});
				if (!isNaN(aspect)) {
					cropperInstance.setAspectRatio(aspect);
				}
			} catch (err) {
				console.error('[CropPage] Failed to initialize cropper:', err);
				imageEditorStore.imageLoadError(`Failed to initialize cropper: ${err.message}`);
				cropperInstance = destroyCropperInstance(cropperInstance); // Limpia en caso de error
			}
		} else {
			console.warn('[CropPage] Cropper init skipped (final check). Conditions changed.');
		}
	}

	// updateCropDataFromEvent, updateCropData, updateCroppedAreaPixels (sin cambios)
	function updateCropDataFromEvent(event) {
		if (cropperInstance && !isApplying) {
			updateCroppedAreaPixels(cropperInstance.getData(true));
		}
	}
	function updateCropData() {
		if (cropperInstance && !isApplying) {
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
		} else if (!data || data.width <= 0 || data.height <= 0) {
			croppedAreaPixels = null;
		}
	}

	// updateAspectRatio (sin cambios)
	function updateAspectRatio(newAspect, label) {
		if (isLoading || isApplying) return;
		aspect = newAspect;
		aspectRatioLabel = label;
		if (cropperInstance) {
			cropperInstance.setAspectRatio(newAspect);
		}
	}

	// updateZoomFromSlider (sin cambios)
	function updateZoomFromSlider(event) {
		if (!cropperInstance || initialZoomRatio <= 0 || isLoading || isApplying) return;
		const imgData = cropperInstance.getImageData();
		if (!imgData || imgData.naturalWidth === 0) return;
		const sliderValue = parseFloat(event.target.value);
		const targetAbsoluteRatio = initialZoomRatio * (sliderValue / 100);
		if (targetAbsoluteRatio <= 0) return;
		isUpdatingFromSlider = true;
		try {
			cropperInstance.zoomTo(targetAbsoluteRatio);
		} catch (e) {
			console.warn('Error zooming:', e);
		} finally {
			tick().then(() => {
				isUpdatingFromSlider = false;
			});
		}
	}

	// updateSliderFromCropper (sin cambios)
	function updateSliderFromCropper(event) {
		if (
			!cropperInstance ||
			initialZoomRatio <= 0 ||
			isUpdatingFromSlider ||
			isLoading ||
			isApplying
		) {
			if (isUpdatingFromSlider) isUpdatingFromSlider = false;
			return;
		}
		const imgData = cropperInstance.getImageData();
		if (!imgData || imgData.naturalWidth === 0) return;
		const currentAbsoluteRatio = event.detail.ratio;
		const newSliderValue = Math.round((currentAbsoluteRatio / initialZoomRatio) * 100);
		const minZoom = 1;
		const maxZoom = 500;
		const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newSliderValue));
		if (zoom !== clampedZoom) {
			zoom = clampedZoom;
		}
	}

	// handleApplyCrop (eliminamos la llamada a destroyCropperInstance aquí)
	async function handleApplyCrop() {
		if (!cropperInstance || !imageUUID || isApplying || isLoading) return;
		const cropData = cropperInstance.getData(true);
		if (!cropData || cropData.width <= 0 || cropData.height <= 0) {
			console.warn('Invalid crop area selected.');
			return;
		}

		// *** YA NO destruimos cropper aquí ***
		// cropperInstance = destroyCropperInstance(cropperInstance);
		// croppedAreaPixels = null;
		// La destrucción ahora ocurre en handleImageLoad DESPUÉS del refresh

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

	// --- Lifecycle ---
	onMount(async () => {
		// Solo carga assets, la inicialización depende de la carga de la imagen
		try {
			await loadCropperAssetsIfNeeded();
		} catch (err) {
			console.error('Failed to load Cropper assets onMount:', err);
		}
	});

	onDestroy(() => {
		unsubscribeStore();
		cropperInstance = destroyCropperInstance(cropperInstance); // Asegura limpieza al salir
		imageEditorStore.cleanupBlobUrl();
	});

	// --- Reactive Computations ---
	// Mantenemos estos para habilitar/deshabilitar controles específicos de Cropper
	$: canControlCropper = !!cropperInstance && !isLoading && !isApplying;
	$: canApply =
		canControlCropper &&
		!!croppedAreaPixels &&
		croppedAreaPixels.width > 0 &&
		croppedAreaPixels.height > 0;

	// --- Quitamos el reactive effect para inicializar/destruir cropper basado en imageUrl ---
	// $: if (imageUrl && imageElement ...) // <-- ELIMINADO
	// El flujo ahora es: imageUrl cambia -> <img> on:load -> handleImageLoad -> destroy -> initialize
</script>

<svelte:head>
	<title>Crop Image - Slurp Tools</title>
</svelte:head>

<ImageEditorLayout
	toolTitle="Image Cropper"
	toolDescription="Select an image, adjust the selection, and apply the crop."
>
	<div slot="toolbar-left">
		<span class="toolbar-label">Aspect Ratio:</span>
		<div class="aspect-ratio-controls">
			<button
				class:active={aspectRatioLabel === 'Free'}
				on:click={() => updateAspectRatio(NaN, 'Free')}
				disabled={!canControlCropper}>Free</button
			>
			<button
				class:active={aspectRatioLabel === '1:1'}
				on:click={() => updateAspectRatio(1, '1:1')}
				disabled={!canControlCropper}>1:1</button
			>
			<button
				class:active={aspectRatioLabel === '4:3'}
				on:click={() => updateAspectRatio(4 / 3, '4:3')}
				disabled={!canControlCropper}>4:3</button
			>
			<button
				class:active={aspectRatioLabel === '16:9'}
				on:click={() => updateAspectRatio(16 / 9, '16:9')}
				disabled={!canControlCropper}>16:9</button
			>
		</div>
	</div>
	<div slot="toolbar-right">
		<button
			class="apply-button button-like toolbar-button"
			on:click={handleApplyCrop}
			disabled={!canApply}
		>
			{#if isApplying}<span class="button-spinner"></span> Applying...{:else}Apply Crop{/if}
		</button>
	</div>

	<div slot="main-content" class="cropper-main-content">
		{#if imageUrl}
			<div class="cropper-container">
				<img
					bind:this={imageElement}
					src={imageUrl}
					alt={$imageEditorStore.originalFilename || 'Image to crop'}
					key={imageUrl}
					class="crop-image"
					crossorigin="anonymous"
					on:load={handleImageLoad}
					on:error={handleImageError}
					style:opacity={isLoading && !cropperInstance ? 0.5 : 1}
				/>
			</div>
		{:else if !isLoading}
			<p class="placeholder-text">Select an image to start.</p>
		{/if}
	</div>

	<svelte:fragment slot="sidebar-content" let:openFilePicker>
		<FileManagementSidebar on:openFilePicker={openFilePicker} />
		<div class="sidebar-section section-details">
			<h4 class="h4-pink">Current Selection</h4>
			{#if croppedAreaPixels && canControlCropper}
				<div class="details-grid">
					<span>W:</span> <span>{croppedAreaPixels.width}px</span>
					<span>H:</span> <span>{croppedAreaPixels.height}px</span>
					<span>X:</span> <span>{croppedAreaPixels.x}px</span>
					<span>Y:</span> <span>{croppedAreaPixels.y}px</span>
				</div>
			{:else if imageUUID && !isLoading && !isApplying}
				<p class="placeholder-text-small">Initializing crop area...</p>
			{:else if isLoading}
				<p class="placeholder-text-small">Loading...</p>
			{:else}
				<p class="placeholder-text-small">No selection.</p>
			{/if}
		</div>
		<div class="sidebar-section section-controls">
			<h4 class="h4-teal">Controls</h4>
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
					disabled={!canControlCropper}
				/>
				<span class="zoom-value">{zoom}%</span>
			</div>
		</div>
		<HistoryControlsSidebar />
		<DownloadSidebar />
	</svelte:fragment>
</ImageEditorLayout>

<style>
	.toolbar-label {
		font-size: 0.9rem;
		color: var(--base); /* Más contraste sobre fondo oscuro */
		font-weight: 500;
		display: inline-block; /* Asegura que permanezca en línea */
		align-self: center; /* Centrado vertical */
		white-space: nowrap; /* Evita que se rompa en móviles */
	}

	.aspect-ratio-controls {
		display: flex;
		background-color: var(--surface0);
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid var(--surface1);
		height: 32px; /* Altura fija para asegurar consistencia */
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
		margin-left: 0.5rem; /* Espacio después de la etiqueta */
	}

	div[slot='toolbar-left'] {
		display: flex;
		align-items: center;
		gap: 0.5rem; /* Espacio entre elementos */
		height: 100%; /* Asegura altura completa */
	}

	.aspect-ratio-controls button {
		background-color: var(--base);
		border: none;
		border-right: 1px solid var(--surface1);
		color: var(--text);
		padding: 0 1rem;
		height: 100%; /* Ocupa toda la altura */
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.15s ease;
		flex: 1;
		min-width: 40px; /* Ancho mínimo para evitar botones muy estrechos */
	}

	.aspect-ratio-controls button:first-child {
		border-left: none;
	}

	.aspect-ratio-controls button:last-child {
		border-right: none;
	}
	.aspect-ratio-controls button:hover:not(:disabled) {
		background-color: var(--blue);
		color: var(--text);
	}

	.aspect-ratio-controls button.active {
		background-color: var(--blue);
		color: var(--crust);
		font-weight: 600;
	}

	.aspect-ratio-controls button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background-color: var(--surface0) !important;
		color: var(--overlay) !important;
		filter: grayscale(50%);
	}

	.apply-button.toolbar-button {
		background-color: var(--green);
		color: var(--crust);
		padding: 0.4rem 1.2rem;
		border-radius: 6px;
		border: none;
		font-weight: 500;
		font-size: 0.9rem;
		height: 32px; /* Misma altura que los botones de ratio */
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
	/* Opcional: estilo para el spinner dentro del botón */
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

	/* --- ESTILOS PARA MAIN AREA (Sin cambios) --- */
	.cropper-main-content {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.cropper-container {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	.crop-image {
		display: block;
		max-width: 100%;
		max-height: 100%;
		opacity: 1;
		transition: opacity 0.2s ease-in-out;
	}
	.placeholder-text {
		font-size: 0.9rem;
		color: var(--subtext0);
		text-align: center;
		padding: 1rem 0;
	}

	/* --- ESTILOS ESPECÍFICOS PARA LA SIDEBAR DE CROP --- */
	.sidebar-section {
		padding: 1.2rem 1.5rem;
		border-radius: 10px;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
		color: var(--base); /* Color de texto por defecto para fondos claros */
		transition:
			transform 0.2s ease-out,
			box-shadow 0.2s ease-out;
		position: relative;
	}
	.sidebar-section:not(.download-section):hover {
		transform: translateY(-3px) scale(1.01);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12);
		z-index: 5;
	}
	.sidebar-section h4 {
		font-family: var(--font-header);
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		padding-bottom: 0.6rem;
		color: inherit; /* Hereda color de la sección */
		border-bottom: 1px solid color-mix(in srgb, currentColor 25%, transparent);
	}

	/* 1. Sección Archivo (Azul Claro en la ref) */
	.section-file {
		background-color: var(--blue); /* Fondo Azul Claro */
		color: var(--crust); /* Texto oscuro */
	}
	/* El componente FileManagementSidebar ya debería tener estilos internos correctos */

	/* 2. Sección Detalles (Fondo Oscuro por defecto en la ref) */
	.section-details {
		background-color: var(--mantle);
		color: var(--base); /* Texto claro sobre fondo oscuro */
	}
	.section-details h4 {
		color: var(--flamingo); /* Título en Rosa */
		border-bottom-color: color-mix(in srgb, var(--flamingo) 50%, transparent);
	}
	/* --- CORRECCIÓN LAYOUT DETAILS-GRID --- */
	.section-details .details-grid {
		display: grid;
		/* Dos columnas: Etiqueta (auto) y Valor (1fr) */
		grid-template-columns: auto 1fr;
		/* Espacio entre filas y columnas */
		gap: 0.4rem 1rem; /* Más espacio horizontal */
		font-size: 0.85rem; /* Un poco más grande */
		font-family: var(--font-mono);
		color: var(--base); /* Texto claro */
	}
	.section-details .details-grid span:nth-child(odd) {
		/* Estilo para Etiquetas (W:, H:, X:, Y:) */
		opacity: 0.8; /* Ligeramente menos énfasis */
		text-align: right;
		white-space: nowrap;
		font-weight: 500;
		padding-right: 0.5em; /* Espacio antes del valor */
	}
	.section-details .details-grid span:nth-child(even) {
		/* Estilo para Valores (719px, 1279px, etc.) */
		font-weight: 600;
		text-align: left; /* Alineado a la izquierda */
		/* Sin fondo extra para los valores */
		/* background: color-mix(in srgb, var(--base) 15%, transparent); */
		/* padding: 0.1rem 0.4rem; */
		/* border-radius: 3px; */
	}
	.section-details .placeholder-text-small {
		font-size: 0.8rem;
		color: var(--subtext0); /* Placeholder claro sobre fondo oscuro */
		text-align: center;
		padding: 0.5rem 0;
		margin: 0;
	}

	/* 3. Sección Controles (Fondo Oscuro por defecto en la ref) */
	.section-controls {
		/* background-color: var(--teal); <-- Quitamos fondo teal */
		background-color: var(--mantle); /* Fondo oscuro */
		color: var(--base); /* Texto claro */
	}
	.section-controls h4 {
		color: var(--teal); /* Título en Teal */
		border-bottom-color: color-mix(in srgb, var(--teal) 50%, transparent);
	}
	.section-controls .control-item {
		margin-bottom: 1.2rem;
	}
	.section-controls .control-item:last-child {
		margin-bottom: 0;
	}
	.section-controls .control-item label {
		color: var(--base);
		font-weight: 500;
		display: block;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}
	.section-controls .zoom-controls {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		flex-wrap: wrap;
	}
	.section-controls .zoom-slider {
		flex-grow: 1;
		height: 8px;
		cursor: pointer;
		accent-color: var(--base); /* Color del thumb */
		/* Usamos surface0 para el track del slider sobre fondo mantle */
		background: var(--surface0);
		border-radius: 4px;
		margin: 0;
		min-width: 80px;
		transition: box-shadow 0.2s ease;
	}
	.section-controls .zoom-slider:hover:not(:disabled) {
		box-shadow: 0 0 5px color-mix(in srgb, var(--base) 50%, transparent);
	}
	.section-controls .zoom-slider:disabled {
		cursor: not-allowed;
		opacity: 0.5;
		box-shadow: none;
		accent-color: var(--overlay);
		background: var(--overlay0);
	}
	.section-controls .zoom-value {
		color: var(--base);
		font-weight: 500;
		font-size: 0.9rem;
		min-width: 45px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	/* 4. Sección Historial (Fondo Teal Claro en la ref) */
	.section-history {
		background-color: var(--teal); /* Fondo Teal Claro */
		color: var(--crust); /* Texto oscuro */
	}
	.section-history h4 {
		color: var(--crust); /* Texto oscuro */
		/* Borde inferior oscuro que contraste */
		border-bottom-color: color-mix(in srgb, var(--crust) 30%, transparent);
	}
	/* El componente HistoryControlsSidebar define los botones internos */
	/* Asegúrate que el componente use background: var(--crust); color: var(--sky); para los botones */
	/* Para asegurar el color del texto del botón sobre fondo claro: */
	.section-history .history-button {
		background-color: var(--crust); /* Fondo oscuro */
		color: var(--sky); /* Texto/icono celeste */
	}
	.section-history .history-button:hover:not(:disabled) {
		background-color: var(--mantle); /* Oscuro al hover */
	}
	.section-history .history-button:disabled {
		background-color: var(--surface0) !important;
		color: var(--overlay) !important;
		border-color: var(--surface1) !important;
		opacity: 0.5;
		filter: grayscale(50%);
	}

	/* Estilos Download Button (Rosa en la ref) */
	/* El componente DownloadSidebar necesita un ajuste o una clase pasada */
	/* Asumamos que DownloadSidebar tiene un <button class="button-like save-button {extraClass}"> */
	/* Si no, ajustamos el estilo global del save-button aquí */
	:global(.download-section .save-button) {
		/* Forma de apuntar si no pasamos clase */
		background-color: var(--pink) !important; /* Fondo Rosa */
		color: var(--crust) !important; /* Texto oscuro */
		border: none !important;
	}
	:global(.download-section .save-button:hover:not(:disabled)) {
		filter: brightness(1.1);
	}
	:global(.download-section .save-button:disabled) {
		background-color: var(--overlay0) !important;
		color: var(--subtext0) !important;
		opacity: 0.6;
		filter: grayscale(30%);
	}

	/* --- Mobile Adjustments (Sin cambios) --- */
	@media (max-width: 480px) {
		.aspect-ratio-controls button {
			padding: 0.4rem 0.6rem;
			font-size: 0.8rem;
		}
		.section-details .details-grid {
			grid-template-columns: auto 1fr;
		}
		.section-details .details-grid span {
			text-align: left;
		}
	}
</style>
