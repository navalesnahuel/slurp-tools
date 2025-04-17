const defaultAccentColorVarNames = [
	'pink',
	'mauve',
	'red',
	'maroon',
	'peach',
	'yellow',
	'green',
	'teal',
	'sky',
	'sapphire',
	'blue',
	'lavender'
];

/**
 * Svelte Action to apply a random underline color on hover.
 * Uses the --underline-color CSS variable on the element.
 * @param {HTMLElement} node - The element the action is applied to.
 * @param {object} [options] - Optional parameters.
 * @param {string[]} [options.colors=defaultAccentColorVarNames] - Array of CSS variable names (without --) to use.
 */
export function randomUnderline(node, options = {}) {
	// Use provided colors or the default list
	const colorsToUse = options.colors || defaultAccentColorVarNames;

	function getRandomColorName() {
		if (!colorsToUse || colorsToUse.length === 0) {
			return 'blue'; // Fallback if no colors defined
		}
		const randomIndex = Math.floor(Math.random() * colorsToUse.length);
		return colorsToUse[randomIndex];
	}

	// Event handler for mouse enter
	const handleMouseEnter = () => {
		const randomColorName = getRandomColorName();
		node.style.setProperty('--underline-color', `var(--${randomColorName})`);
	};

	// Event handler for mouse leave
	const handleMouseLeave = () => {
		node.style.removeProperty('--underline-color');
	};

	// Attach listeners to the node
	node.addEventListener('mouseenter', handleMouseEnter);
	node.addEventListener('mouseleave', handleMouseLeave);

	// Return the destroy function to clean up listeners when the element is removed
	return {
		destroy() {
			node.removeEventListener('mouseenter', handleMouseEnter);
			node.removeEventListener('mouseleave', handleMouseLeave);
		}
	};
}
