// src/lib/stores/imageEditorStore.js
// Manages the core state for single-image editing tools
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import * as imageApi from '$lib/services/imageApi.js';

const initialState = {
	imageFile: null,
	originalFilename: '',
	imageUUID: null,
	imageUrl: '',
	currentBlobUrl: null,
	imageInfo: null, // Should contain { UUID, Version, FilePath } from API
	originalDimensions: null,
	isLoading: false,
	isApplying: false,
	loadingStep: '',
	errorMessage: ''
};

function createImageEditorStore() {
	const { subscribe, set, update } = writable({ ...initialState });

	// --- Internal Helpers ---
	function _setLoading(loading, step = '') {
		update((state) => ({
			...state,
			isLoading: loading,
			isApplying: loading ? state.isApplying : false,
			loadingStep: step,
			errorMessage: loading ? '' : state.errorMessage
		}));
	}

	function _setApplying(applying, step = 'Applying changes...') {
		update((state) => ({
			...state,
			isApplying: applying,
			isLoading: applying,
			loadingStep: applying ? step : state.loadingStep,
			errorMessage: applying ? '' : state.errorMessage
		}));
	}

	function _setError(message) {
		// Primarily for non-filter/non-history errors now
		console.error('Image Editor Store Error:', message);
		update((state) => ({
			...state,
			errorMessage: message,
			isLoading: false,
			isApplying: false,
			loadingStep: ''
		}));
	}

	function _cleanupBlobUrl() {
		update((state) => {
			if (state.currentBlobUrl && state.currentBlobUrl.startsWith('blob:')) {
				console.log('[Store] Revoking Blob URL:', state.currentBlobUrl);
				try {
					URL.revokeObjectURL(state.currentBlobUrl);
				} catch (e) {
					console.warn('Error revoking blob URL', e);
				}
				return { ...state, currentBlobUrl: null };
			}
			return state;
		});
	}

	function _resetState(keepError = false) {
		const currentError = get({ subscribe }).errorMessage;
		_cleanupBlobUrl();
		set({ ...initialState, errorMessage: keepError ? currentError : '' });
		console.log('[Store] State Reset.');
	}

	// --- Actions ---
	async function selectAndUpload(file) {
		// ... (no changes from previous correct version) ...
		if (!file || !browser) return;
		_resetState();
		_setLoading(true, 'Uploading image...');
		const localImageUrl = URL.createObjectURL(file);
		update((state) => ({
			...state,
			imageFile: file,
			originalFilename: file.name,
			imageUrl: localImageUrl,
			currentBlobUrl: localImageUrl,
			originalDimensions: null
		}));
		try {
			const result = await imageApi.uploadImage(file);
			console.log('[Store] Upload successful:', result);
			update((state) => ({
				...state,
				imageUUID: result.UUID,
				imageInfo: result,
				imageFile: null,
				isLoading: true,
				loadingStep: 'Loading image data...'
			}));
			await refreshImage(false);
		} catch (error) {
			_setError(`Error uploading ${file.name}: ${error.message}`);
			_resetState(true);
		}
	}

	async function refreshImage(resetApplying = true) {
		// ... (no changes from previous correct version) ...
		const currentUUID = get({ subscribe }).imageUUID;
		if (!currentUUID || !browser) {
			_resetState();
			return;
		}
		console.log('[Store] Refreshing image for UUID:', currentUUID);
		_setLoading(true, 'Loading image preview...');
		if (resetApplying) _setApplying(false);
		_cleanupBlobUrl();
		await new Promise((resolve) => setTimeout(resolve, 0));
		const newImageUrl = imageApi.getRenderImage(currentUUID) + '?t=' + Date.now();
		update((state) => ({ ...state, imageUrl: newImageUrl, originalDimensions: null }));
	}

	function imageLoadComplete(dimensions) {
		// ... (no changes from previous correct version) ...
		console.log('[Store] Image load signaled complete. Dimensions:', dimensions);
		update((state) => ({
			...state,
			isLoading: false,
			isApplying: false,
			loadingStep: '',
			originalDimensions: dimensions
		}));
	}

	function imageLoadError(errorMsg = 'Failed to load image preview.') {
		// ... (no changes from previous correct version) ...
		console.error('[Store] Image load signaled error.');
		_setError(errorMsg);
		update((state) => ({ ...state, imageUrl: '', originalDimensions: null }));
	}

	async function applyFilter(filterFn, filterName = 'filter') {
		const state = get({ subscribe });
		// Basic guard: must have UUID and not be busy
		if (!state.imageUUID || state.isApplying || state.isLoading) {
			console.warn(`[Store] Cannot apply ${filterName}, no UUID or already busy.`);
			return;
		}

		console.log(`[Store] Applying ${filterName}...`);
		_setApplying(true, `Applying ${filterName}...`);

		try {
			const result = await filterFn(state.imageUUID); // Call the specific API function
			console.log(`[Store] ${filterName} successful:`, result);

			// Update state with the new info BEFORE refreshing
			update((s) => ({
				...s,
				imageUUID: result.UUID, // Update just in case
				imageInfo: result // Store the NEW version info
				// Keep isLoading/isApplying true until refresh->load completes
			}));

			// Refresh the image view
			await refreshImage(false);
		} catch (error) {
			// *** SILENT ERROR HANDLING for filters/history ***
			console.error(`[Store] ${filterName} API Failed:`, error.message); // Log for debugging

			// ONLY clear loading flags, DO NOT set errorMessage
			update((state) => ({
				...state,
				isLoading: false,
				isApplying: false,
				loadingStep: ''
				// errorMessage is NOT updated here
			}));
		}
	}

	// --- UNDO/REDO simplified ---
	// No internal guards needed, applyFilter handles the busy check.
	// Button enablement handles the initial UUID check.
	async function undo() {
		await applyFilter(imageApi.undoChanges, 'Undo');
	}

	async function redo() {
		await applyFilter(imageApi.redoChanges, 'Redo');
	}

	function changeImage() {
		console.log('[Store] Requesting change image.');
		_resetState();
		// Component should trigger file input
	}

	// --- Public Interface ---
	return {
		subscribe,
		selectAndUpload,
		refreshImage,
		applyFilter, // Expose if needed for other direct filters
		undo,
		redo,
		changeImage,
		resetState: _resetState,
		cleanupBlobUrl: _cleanupBlobUrl,
		imageLoadComplete,
		imageLoadError
	};
}

export const imageEditorStore = createImageEditorStore();
