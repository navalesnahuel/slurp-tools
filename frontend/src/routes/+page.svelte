<!-- src/routes/+page.svelte -->
<script>
	import ToolCard from '../components/ToolCard.svelte';

	const tools = [
		{
			title: 'Image Rotate',
			description:
				'Rotate your images left, right, or flip them vertically and horizontally with ease.',
			link: '/image-rotate',
			icon: '🔄',
			accentColor: 'blue',
			comingSoon: false
		},
		{
			title: 'Image Resize',
			description:
				'Quickly resize your images by setting custom dimensions or using presets.',
			link: '/image-resize',
			icon: '📐',
			accentColor: 'red',
			comingSoon: false
		},
		{
			title: 'Image Crop',
			description: 'Crop unwanted parts of your image manually or with aspect ratio presets.',
			link: '/image-crop',
			icon: '✂️',
			accentColor: 'crust',
			comingSoon: false
		},
		{
			title: 'Image Editor',
			description:
				'Edit your images with basic tools like crop, rotate, resize, filters, and more.',
			link: '/image-editor',
			icon: '🖌️',
			accentColor: 'green',
			comingSoon: false
		},
		{
			title: 'Scan to PDF',
			description:
				'Enhance scanned documents by cleaning them up and exporting to high-quality PDFs.',
			link: '/image-scan',
			icon: '📷',
			accentColor: 'peach',
			comingSoon: false
		},
		{
			title: 'Images to PDF',
			description:
				'Convert multiple images (JPG, PNG, WEBP) into a single organized PDF document.',
			link: '/image-to-pdf',
			icon: '📄',
			accentColor: 'mauve',
			comingSoon: false
		}
	];
</script>

<section class="page-hero">
	<div class="hero-content">
		<h1 class="headline">Simplify Your Digital Tasks</h1>
		<p class="tagline">
			Slurp Tools offers a collection of fast, focused and bloat-free utilities
			<br />for your everyday image and document needs and without ads.
		</p>
	</div>
</section>

<section class="tools-section" id="tools">
	<div class="grid-container">
		{#each tools as tool, index}
			<ToolCard
				title={tool.title}
				description={tool.description}
				link={tool.link}
				icon={tool.icon}
				accentColor={tool.accentColor}
				comingSoon={tool.comingSoon}
				delay={index * 80}
			/>
		{/each}
	</div>
</section>

<style>
	.page-hero {
		padding: 4rem 1rem 3rem 1rem;
		text-align: center;
		margin-bottom: 3rem;
		border-bottom: 1px solid var(--overlay);
	}

	.hero-content {
		max-width: 850px;
		margin: 0 auto;
	}

	.headline {
		font-family: var(--font-header);
		font-size: clamp(2.6rem, 6vw, 3.8rem);
		color: var(--mauve);
		margin: 0 0 1.2rem 0;
		font-weight: 700;
		line-height: 1.2;
	}

	.tagline {
		font-size: clamp(1.05rem, 2.5vw, 1.25rem);
		color: var(--text);
		max-width: 700px;
		margin: 0 auto;
		line-height: 1.65;
		font-weight: 400;
	}

	.tools-section {
		padding: 0 1rem;
		max-width: 1200px;
		margin: 0 auto 11rem auto;
	}

	.section-heading {
		font-family: var(--font-header);
		text-align: center;
		margin-bottom: 3rem;
		font-size: clamp(2rem, 4.5vw, 2.5rem);
		color: var(--teal);
		font-weight: 600;
	}

	.grid-container {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
		gap: 2rem;
		align-items: stretch;
	}
</style>
