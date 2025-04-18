// src/lib/utils/helpers.js
/**
 * Truncates a filename to a desired length, preserving the extension.
 * @param {string} name - The filename.
 * @param {number} [length=25] - The maximum desired length.
 * @returns {string} The truncated filename.
 */
export function truncateFilename(name, length = 25) {
	if (!name) return '';
	if (name.length <= length) return name;
	const extIndex = name.lastIndexOf('.');
	const ext = extIndex !== -1 ? name.substring(extIndex) : '';
	const base = extIndex !== -1 ? name.substring(0, extIndex) : name;
	// Calculate max base length considering "..." and extension length
	const maxBaseLength = Math.max(0, length - ext.length - (ext.length > 0 ? 3 : 0));
	if (maxBaseLength <= 0) {
		// If extension + "..." is already too long, just truncate the whole name
		return name.substring(0, length - 3) + '...';
	}
	const truncatedBase = base.length > maxBaseLength ? base.substring(0, maxBaseLength) : base;
	return `${truncatedBase}...${ext}`;
}

/**
 * Debounces a function.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The debounce delay in milliseconds.
 * @returns {Function} The debounced function.
 */
export function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

// Add other general utility functions here if needed.
