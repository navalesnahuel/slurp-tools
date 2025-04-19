// src/lib/utils/helpers.js

export function truncateFilename(name, length = 25) {
	if (!name) return '';
	if (name.length <= length) return name;
	const extIndex = name.lastIndexOf('.');
	const ext = extIndex !== -1 ? name.substring(extIndex) : '';
	const base = extIndex !== -1 ? name.substring(0, extIndex) : name;

	const maxBaseLength = Math.max(0, length - ext.length - (ext.length > 0 ? 3 : 0));
	if (maxBaseLength <= 0) {
		return name.substring(0, length - 3) + '...';
	}
	const truncatedBase = base.length > maxBaseLength ? base.substring(0, maxBaseLength) : base;
	return `${truncatedBase}...${ext}`;
}

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
