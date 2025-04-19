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

export function randomUnderline(node, options = {}) {
	const colorsToUse = options.colors || defaultAccentColorVarNames;

	function getRandomColorName() {
		if (!colorsToUse || colorsToUse.length === 0) {
			return 'blue';
		}
		const randomIndex = Math.floor(Math.random() * colorsToUse.length);
		return colorsToUse[randomIndex];
	}

	const handleMouseEnter = () => {
		const randomColorName = getRandomColorName();
		node.style.setProperty('--underline-color', `var(--${randomColorName})`);
	};

	const handleMouseLeave = () => {
		node.style.removeProperty('--underline-color');
	};

	node.addEventListener('mouseenter', handleMouseEnter);
	node.addEventListener('mouseleave', handleMouseLeave);

	return {
		destroy() {
			node.removeEventListener('mouseenter', handleMouseEnter);
			node.removeEventListener('mouseleave', handleMouseLeave);
		}
	};
}
