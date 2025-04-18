// src/lib/utils/cropperUtils.js
import { browser } from '$app/environment';

let cropperAssetsLoaded = false;
let loadingPromise = null;

/**
 * Loads Cropper.js CSS and JS assets if they haven't been loaded yet.
 * Ensures it only tries to load once, even if called multiple times concurrently.
 * @returns {Promise<void>} A promise that resolves when assets are loaded or errors.
 */
export async function loadCropperAssetsIfNeeded() {
	if (!browser) return Promise.resolve(); // Don't run on server
	if (cropperAssetsLoaded) return Promise.resolve();
	if (loadingPromise) return loadingPromise; // Return existing promise if loading is in progress

	loadingPromise = new Promise(async (resolve, reject) => {
		console.log('[CropperUtils] Loading Cropper.js assets...');
		try {
			if (typeof Cropper !== 'undefined') {
				console.log('[CropperUtils] Cropper already defined.');
				cropperAssetsLoaded = true;
				resolve();
				return;
			}

			const scriptExists = !!document.querySelector('script[src*="cropper.min.js"]');
			const styleExists = !!document.querySelector('link[href*="cropper.min.css"]');
			const loadPromises = [];

			if (!styleExists) {
				console.log('[CropperUtils] Loading Cropper CSS...');
				const cropperStyles = document.createElement('link');
				cropperStyles.rel = 'stylesheet';
				cropperStyles.href =
					'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
				document.head.appendChild(cropperStyles);
				// CSS loading doesn't have a standard onload, assume it loads quickly enough
			}

			if (!scriptExists) {
				console.log('[CropperUtils] Loading Cropper JS...');
				const cropperScript = document.createElement('script');
				cropperScript.src =
					'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
				cropperScript.async = true;
				loadPromises.push(
					new Promise((scriptResolve, scriptReject) => {
						cropperScript.onload = () => {
							console.log('[CropperUtils] Cropper JS loaded.');
							scriptResolve();
						};
						cropperScript.onerror = (err) => {
							console.error('[CropperUtils] Failed to load Cropper JS.', err);
							scriptReject(new Error('Failed to load Cropper.js script.'));
						};
						document.head.appendChild(cropperScript);
					})
				);
			} else if (typeof Cropper === 'undefined') {
				// Script tag exists but Cropper global isn't defined yet, wait a bit
				console.log('[CropperUtils] Script tag found, waiting for Cropper global...');
				loadPromises.push(new Promise((resolveWait) => setTimeout(resolveWait, 150)));
			}

			if (loadPromises.length > 0) {
				await Promise.all(loadPromises);
			}

			// Final check if Cropper is now available
			if (typeof Cropper !== 'undefined') {
				cropperAssetsLoaded = true;
				console.log('[CropperUtils] Assets loaded successfully.');
				resolve();
			} else {
				reject(new Error('Cropper.js library failed to initialize.'));
			}
		} catch (err) {
			console.error('[CropperUtils] Error during asset loading:', err);
			reject(err);
		} finally {
			loadingPromise = null; // Reset promise once done (success or fail)
		}
	});

	return loadingPromise;
}

/**
 * Safely destroys a Cropper.js instance.
 * @param {Cropper|null} cropperInstance - The instance to destroy.
 * @returns {null} Always returns null.
 */
export function destroyCropperInstance(cropperInstance) {
	if (cropperInstance) {
		try {
			cropperInstance.destroy();
			console.log('[CropperUtils] Cropper instance destroyed.');
		} catch (e) {
			console.error('[CropperUtils] Error destroying cropper instance:', e);
		}
	}
	return null; // Return null to easily reset the variable holding the instance
}
