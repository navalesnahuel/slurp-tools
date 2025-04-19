// src/lib/stores/imageEditorStore.js
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import * as imageApi from '$lib/services/imageApi.js';

const initialState = {
	imageFile: null,
	originalFilename: '',
	imageUUID: null,
	imageUrl: '',
	currentBlobUrl: null,
	imageInfo: null,
	originalDimensions: null,
	isLoading: false,
	isApplying: false,
	loadingStep: '',
	errorMessage: ''
};

function createImageEditorStore() {
	const { subscribe, set, update } = writable({ ...initialState });

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
				try {
					URL.revokeObjectURL(state.currentBlobUrl);
				} catch (e) {}
				return { ...state, currentBlobUrl: null };
			}
			return state;
		});
	}

	function _resetState(keepError = false) {
		const currentError = get({ subscribe }).errorMessage;
		_cleanupBlobUrl();
		set({ ...initialState, errorMessage: keepError ? currentError : '' });
	}

	async function selectAndUpload(file) {
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
		const currentUUID = get({ subscribe }).imageUUID;
		if (!currentUUID || !browser) {
			_resetState();
			return;
		}

		_setLoading(true, 'Loading image preview...');
		if (resetApplying) _setApplying(false);
		_cleanupBlobUrl();
		await new Promise((resolve) => setTimeout(resolve, 0));
		const newImageUrl = imageApi.getRenderImage(currentUUID) + '?t=' + Date.now();
		update((state) => ({ ...state, imageUrl: newImageUrl, originalDimensions: null }));
	}

	function imageLoadComplete(dimensions) {
		update((state) => ({
			...state,
			isLoading: false,
			isApplying: false,
			loadingStep: '',
			originalDimensions: dimensions
		}));
	}

	function imageLoadError(errorMsg = 'Failed to load image preview.') {
		_setError(errorMsg);
		update((state) => ({ ...state, imageUrl: '', originalDimensions: null }));
	}

	async function applyFilter(filterFn, filterName = 'filter') {
		const state = get({ subscribe });

		if (!state.imageUUID || state.isApplying || state.isLoading) {
			return;
		}

		_setApplying(true, `Applying ${filterName}...`);

		try {
			const result = await filterFn(state.imageUUID);

			update((s) => ({
				...s,
				imageUUID: result.UUID,
				imageInfo: result
			}));

			await refreshImage(false);
		} catch (error) {
			update((state) => ({
				...state,
				isLoading: false,
				isApplying: false,
				loadingStep: ''
			}));
		}
	}

	async function undo() {
		await applyFilter(imageApi.undoChanges, 'Undo');
	}

	async function redo() {
		await applyFilter(imageApi.redoChanges, 'Redo');
	}

	function changeImage() {
		_resetState();
	}

	return {
		subscribe,
		selectAndUpload,
		refreshImage,
		applyFilter,
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
