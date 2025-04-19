// src/lib/utils/cropperUtils.js
import { browser } from '$app/environment';

let cropperAssetsLoaded = false;
let loadingPromise = null;

export async function loadCropperAssetsIfNeeded() {
	if (!browser) return Promise.resolve();
	if (cropperAssetsLoaded) return Promise.resolve();
	if (loadingPromise) return loadingPromise;

	loadingPromise = new Promise(async (resolve, reject) => {
		try {
			if (typeof Cropper !== 'undefined') {
				cropperAssetsLoaded = true;
				resolve();
				return;
			}

			const scriptExists = !!document.querySelector('script[src*="cropper.min.js"]');
			const styleExists = !!document.querySelector('link[href*="cropper.min.css"]');
			const loadPromises = [];

			if (!styleExists) {
				const cropperStyles = document.createElement('link');
				cropperStyles.rel = 'stylesheet';
				cropperStyles.href =
					'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
				document.head.appendChild(cropperStyles);
			}

			if (!scriptExists) {
				const cropperScript = document.createElement('script');
				cropperScript.src =
					'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
				cropperScript.async = true;
				loadPromises.push(
					new Promise((scriptResolve, scriptReject) => {
						cropperScript.onload = () => {
							scriptResolve();
						};
						cropperScript.onerror = (err) => {
							scriptReject(new Error('Failed to load Cropper.js script.'));
						};
						document.head.appendChild(cropperScript);
					})
				);
			} else if (typeof Cropper === 'undefined') {
				loadPromises.push(new Promise((resolveWait) => setTimeout(resolveWait, 150)));
			}

			if (loadPromises.length > 0) {
				await Promise.all(loadPromises);
			}

			if (typeof Cropper !== 'undefined') {
				cropperAssetsLoaded = true;

				resolve();
			} else {
				reject(new Error('Cropper.js library failed to initialize.'));
			}
		} catch (err) {
			reject(err);
		} finally {
			loadingPromise = null;
		}
	});

	return loadingPromise;
}

export function destroyCropperInstance(cropperInstance) {
	if (cropperInstance) {
		try {
			cropperInstance.destroy();
		} catch (e) {}
	}
	return null;
}
