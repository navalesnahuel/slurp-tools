export const API_BASE_URL = 'http://localhost:3000';

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

		return data;
	} catch (err) {
		throw new Error(`Filter Error: ${err.message}`);
	}
}

export function getRenderImage(uuid) {
	if (!uuid) throw new Error('UUID is required to build image URL');
	return `${API_BASE_URL}/image/${uuid}/download?t=${Date.now()}`;
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

		return data;
	} catch (err) {
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

		return data;
	} catch (err) {
		throw new Error(`Undo Error: ${err.message}`);
	}
}

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

		if (!response.ok) {
			let errorMsg = response.statusText;
			try {
				errorMsg = (await response.json()).message || errorMsg;
			} catch (e) {}
			throw new Error(`Crop filter failed: ${errorMsg} (${response.status})`);
		}

		const data = await response.json();

		if (!data.UUID || typeof data.Version === 'undefined') {
			throw new Error('Crop filter response missing UUID or Version.');
		}

		return data;
	} catch (err) {
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
				angle: angle,
				interpolation: interpolation
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
			let errorBody = await response.text();
			try {
				const jsonError = JSON.parse(errorBody);
				errorBody = jsonError.message || jsonError.error || JSON.stringify(jsonError);
			} catch (parseError) {}

			throw new Error(`Rotate filter failed: ${response.status} ${errorBody}`);
		}

		const data = await response.json();
		return data;
	} catch (err) {
		if (err instanceof Error) {
			throw err;
		} else {
			throw new Error(`Rotate Filter Network/Processing Error: ${err}`);
		}
	}
}

export async function applyScannerPerspective(file, points) {
	if (!file) throw new Error('Image file is required');
	if (!points || points.length !== 4) throw new Error('Exactly 4 corner points are required');
	if (!Array.isArray(points[0]) || points[0].length !== 2) {
		throw new Error('Points must be an array of [x, y] arrays');
	}

	const formData = new FormData();
	formData.append('file', file);
	formData.append('points', JSON.stringify(points));

	const SCANNER_ENDPOINT_URL = 'http://localhost:8000/scanner';

	try {
		const response = await fetch(SCANNER_ENDPOINT_URL, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const errText = await response.text();

			throw new Error(`/scanner failed: ${response.status} ${errText}`);
		}

		const imageBlob = await response.blob();

		if (imageBlob.size === 0) {
			throw new Error('/scanner returned an empty response body.');
		}

		return imageBlob;
	} catch (err) {
		if (err.message.startsWith('/scanner failed:')) {
			throw err;
		}
		throw new Error(`/scanner Network/Processing Error: ${err.message}`);
	}
}

export async function scanAndUpload(file, points) {
	if (!file) throw new Error('Image file is required');
	if (!points || points.length !== 4) throw new Error('Exactly 4 corner points are required');
	if (!Array.isArray(points[0]) || points[0].length !== 2) {
		throw new Error('Points must be an array of [x, y] arrays');
	}

	const formData = new FormData();
	formData.append('image', file);
	formData.append('points', JSON.stringify(points));

	try {
		const response = await fetch(`${API_BASE_URL}/image/scan`, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			let errorBody = await response.text();
			try {
				const jsonError = JSON.parse(errorBody);
				errorBody = jsonError.message || jsonError.error || errorBody;
			} catch (e) {}

			throw new Error(`/image/scan failed: ${response.status} ${errorBody}`);
		}

		const data = await response.json();

		if (!data.UUID || typeof data.Version === 'undefined') {
			throw new Error('/image/scan response missing UUID or Version.');
		}
		return data;
	} catch (err) {
		if (err.message.startsWith('/image/scan failed:')) {
			throw err;
		}
		throw new Error(`/image/scan Network/Processing Error: ${err.message}`);
	}
}

export async function imagesToPDF(files) {
	try {
		const formData = new FormData();
		files.forEach((file) => formData.append('image', file));

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

		const a = document.createElement('a');
		a.href = url;
		a.download = 'image.pdf';
		a.click();
		URL.revokeObjectURL(url);
	} catch (err) {
		alert('Hubo un error al generar el PDF.');
	}
}
