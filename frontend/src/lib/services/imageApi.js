export const API_BASE_URL = 'http://localhost:3000';

/**
 * Upload an image to the server.
 * @param {File} file - The image file to upload.
 * @returns {Promise<{ UUID: string, Version: number, FilePath: string }>}
 */
export async function uploadImage(file) {
	if (!file) throw new Error('No image file provided');

	const formData = new FormData();
	formData.append('image', file);

	try {
		const response = await fetch(`${API_BASE_URL}/image/upload`, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const err = await response.text();
			throw new Error(`Upload failed: ${err}`);
		}

		const data = await response.json();
		return data;
	} catch (err) {
		throw new Error(`Upload Error: ${err.message}`);
	}
}

/**
 * Apply a resize filter to the image.
 * @param {string} uuid - UUID of the image to filter.
 * @param {number} width - Desired width.
 * @param {number} height - Desired height.
 * @returns {Promise<{ UUID: string, Version: number, FilePath: string }>}
 */
export async function applyResizeFilter(uuid, width, height) {
	if (!uuid) throw new Error('Image UUID is required');
	if (!width || !height) throw new Error('Width and height are required');

	const payload = [
		{
			filter: 'resize',
			params: {
				width: Number(width),
				height: Number(height)
			}
		}
	];

	try {
		const response = await fetch(`${API_BASE_URL}/image/filter/${uuid}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			const err = await response.text();
			throw new Error(`Filter failed: ${err}`);
		}

		const data = await response.json();
		console.log('[API] Resized Image:', data);
		return data;
	} catch (err) {
		console.error('[API] Filter Error:', err);
		throw new Error(`Filter Error: ${err.message}`);
	}
}

/**
 * Build a direct download URL to access the latest version of the image.
 * @param {string} uuid - UUID of the image.
 * @returns {string} - Downloadable image URL.
 */
export function getRenderImage(uuid) {
	if (!uuid) throw new Error('UUID is required to build image URL');
	return `${API_BASE_URL}/image/${uuid}/download?t=${Date.now()}`; // cache buster
}

export async function redoChanges(uuid) {
	if (!uuid) throw new Error('UUID is required to redo changes');

	try {
		const response = await fetch(`${API_BASE_URL}/image/${uuid}/redo?t=${Date.now()}`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			const err = await response.text();
			throw new Error(`Redo failed: ${err}`);
		}

		const data = await response.json();
		console.log('[API] Redo Image:', data);
		return data;
	} catch (err) {
		console.error('[API] Redo Error:', err);
		throw new Error(`Redo Error: ${err.message}`);
	}
}

export async function undoChanges(uuid) {
	if (!uuid) throw new Error('UUID is required to undo changes');

	try {
		const response = await fetch(`${API_BASE_URL}/image/${uuid}/undo?t=${Date.now()}`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			const err = await response.text();
			throw new Error(`Undo failed: ${err}`);
		}

		const data = await response.json();
		console.log('[API] Undo Image:', data);
		return data;
	} catch (err) {
		console.error('[API] Undo Error:', err);
		throw new Error(`Undo Error: ${err.message}`);
	}
}

/**
 * Apply a crop filter to the image.
 * @param {string} uuid - UUID of the image to filter.
 * @param {{x: number, y: number, width: number, height: number}} cropData - The crop parameters.
 * @returns {Promise<{ UUID: string, Version: number, FilePath: string }>}
 */
export async function applyCropFilter(uuid, cropData) {
	if (!uuid) throw new Error('Image UUID is required');
	if (
		!cropData ||
		typeof cropData.width === 'undefined' ||
		typeof cropData.height === 'undefined' ||
		typeof cropData.x === 'undefined' ||
		typeof cropData.y === 'undefined'
	) {
		throw new Error('Valid crop data (width, height, anchor) is required');
	}

	const payload = [
		{
			filter: 'crop',
			params: cropData
		}
	];

	try {
		const response = await fetch(`${API_BASE_URL}/image/filter/${uuid}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		console.log('[API] Crop Filter Response Status:', response.status);

		if (!response.ok) {
			let errorMsg = response.statusText;
			try {
				errorMsg = (await response.json()).message || errorMsg;
			} catch (e) {
				/* ignore */
			}
			throw new Error(`Crop filter failed: ${errorMsg} (${response.status})`);
		}

		const data = await response.json();
		console.log('[API] Cropped Image Info:', data);

		if (!data.UUID || typeof data.Version === 'undefined') {
			throw new Error('Crop filter response missing UUID or Version.');
		}

		return data;
	} catch (err) {
		console.error('[API] Crop Filter Error:', err);
		throw new Error(`Crop Filter Error: ${err.message}`);
	}
}

export async function applyRotateFilter(uuid, angle, interpolation = 'linear') {
	if (!uuid) throw new Error('Image UUID is required for rotate filter.');
	if (typeof angle !== 'number' || isNaN(angle)) {
		throw new Error('A valid numeric angle is required for rotate filter.');
	}

	const payload = [
		{
			filter: 'rotate',
			params: {
				angle: angle, // Pass angle directly (assuming it's already a number)
				interpolation: interpolation // Use the parameter
			}
		}
	];

	console.log('[API] Applying Rotate Filter:', payload); // Log payload before sending

	try {
		const response = await fetch(`${API_BASE_URL}/image/filter/${uuid}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			// Try to get more specific error from response body
			let errorBody = await response.text();
			try {
				// Attempt to parse as JSON, maybe the API provides structured errors
				const jsonError = JSON.parse(errorBody);
				errorBody = jsonError.message || jsonError.error || JSON.stringify(jsonError);
			} catch (parseError) {
				// Ignore if it's not JSON, use the raw text
			}
			console.error(`[API] Rotate filter failed (${response.status}): ${errorBody}`);
			throw new Error(`Rotate filter failed: ${response.status} ${errorBody}`);
		}

		const data = await response.json();
		return data; // Return the result from the API (might contain new UUID or status)
	} catch (err) {
		// Catch network errors or errors thrown above
		if (err instanceof Error) {
			throw err; // Re-throw the original error if it's already an Error instance
		} else {
			throw new Error(`Rotate Filter Network/Processing Error: ${err}`);
		}
	}
}

/**
 * Applies perspective correction via the /scanner endpoint.
 * *** This endpoint returns the processed image data directly (Blob) ***
 * @param {File} file - The original image file.
 * @param {Array<[number, number]>} points - Array of 4 [x, y] corner coordinates (absolute pixels).
 * @returns {Promise<Blob>} A Promise resolving to the image Blob.
 */
export async function applyScannerPerspective(file, points) {
	if (!file) throw new Error('Image file is required');
	if (!points || points.length !== 4) throw new Error('Exactly 4 corner points are required');
	if (!Array.isArray(points[0]) || points[0].length !== 2) {
		throw new Error('Points must be an array of [x, y] arrays');
	}

	const formData = new FormData();
	formData.append('file', file);
	formData.append('points', JSON.stringify(points));

	console.log('[API] Calling /scanner with points:', JSON.stringify(points));
	const SCANNER_ENDPOINT_URL = 'http://localhost:8000/scanner'; // Using port 8000

	try {
		const response = await fetch(SCANNER_ENDPOINT_URL, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			// Try to get text error message from the server even for image endpoint
			const errText = await response.text();
			console.error(`[API] /scanner failed (${response.status}): ${errText}`);
			throw new Error(`/scanner failed: ${response.status} ${errText}`);
		}

		console.log('[API] /scanner responded OK. Reading response as Blob.');
		// --- CORRECTION: Read response body as a Blob ---
		const imageBlob = await response.blob();
		console.log('[API] /scanner Blob received, type:', imageBlob.type, 'size:', imageBlob.size);

		if (imageBlob.size === 0) {
			throw new Error('/scanner returned an empty response body.');
		}
		// You might want to check imageBlob.type to ensure it looks like an image
		// e.g., if (!imageBlob.type.startsWith('image/')) { ... }

		return imageBlob; // Return the Blob directly
		// --- END CORRECTION ---
	} catch (err) {
		console.error('[API] /scanner Fetch/Processing Error:', err);
		if (err.message.startsWith('/scanner failed:')) {
			throw err;
		}
		throw new Error(`/scanner Network/Processing Error: ${err.message}`);
	}
}

/**
 * Uploads an image, applies perspective correction based on points,
 * and applies standard scan filters, returning the final image metadata.
 * Hits the `/image/scan` endpoint.
 * @param {File} file - The original image file.
 * @param {Array<[number, number]>} points - Array of 4 [x, y] corner coordinates (absolute pixels).
 * @returns {Promise<{ UUID: string, Version: number, FilePath: string }>} // Assuming backend returns this structure
 */
export async function scanAndUpload(file, points) {
	// Renamed function
	if (!file) throw new Error('Image file is required');
	if (!points || points.length !== 4) throw new Error('Exactly 4 corner points are required');
	if (!Array.isArray(points[0]) || points[0].length !== 2) {
		throw new Error('Points must be an array of [x, y] arrays');
	}

	const formData = new FormData();
	formData.append('image', file);
	formData.append('points', JSON.stringify(points));

	console.log('[API] Calling /image/scan with points:', JSON.stringify(points));

	try {
		// Using API_BASE_URL (Port 3000) for the /image/scan endpoint
		const response = await fetch(`${API_BASE_URL}/image/scan`, {
			method: 'POST',
			body: formData
			// No 'Content-Type' header needed for FormData
		});

		if (!response.ok) {
			let errorBody = await response.text();
			try {
				const jsonError = JSON.parse(errorBody);
				errorBody = jsonError.message || jsonError.error || errorBody;
			} catch (e) {
				/* Ignore if not JSON */
			}
			console.error(`[API] /image/scan failed (${response.status}): ${errorBody}`);
			throw new Error(`/image/scan failed: ${response.status} ${errorBody}`);
		}

		// Assuming the backend returns JSON with UUID, Version, etc.
		const data = await response.json();
		console.log('[API] /image/scan response:', data);
		if (!data.UUID || typeof data.Version === 'undefined') {
			throw new Error('/image/scan response missing UUID or Version.');
		}
		return data;
	} catch (err) {
		console.error('[API] /image/scan Fetch/Processing Error:', err);
		if (err.message.startsWith('/image/scan failed:')) {
			throw err;
		}
		throw new Error(`/image/scan Network/Processing Error: ${err.message}`);
	}
}

export async function imagesToPDF(files) {
	try {
		const formData = new FormData();
		files.forEach((file) => formData.append('image', file)); // clave "images" como en el backend

		const response = await fetch('http://localhost:3000/image/pdf', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Server error: ${errorText}`);
		}

		const blob = await response.blob();
		const url = URL.createObjectURL(blob);

		// Descargar el archivo
		const a = document.createElement('a');
		a.href = url;
		a.download = 'image.pdf';
		a.click();
		URL.revokeObjectURL(url);
	} catch (err) {
		console.error('❌ Error generando PDF:', err);
		alert('Hubo un error al generar el PDF.');
	}
}
