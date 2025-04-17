<!-- src/lib/components/Header.svelte -->

<script>
	import { randomUnderline } from '$lib/randomUnderline.js';
</script>

<header>
	<div class="container">
		<!-- Group logo and nav together -->
		<div class="header-content">
			<a href="/" class="logo-link" aria-label="Slurp Tools Home">
				<!-- Placeholder Icon (replace with SVG/Image later) -->
				<span class="logo-icon" aria-hidden="true">🥤</span>
				<span class="logo-text">Slurp Tools</span>
			</a>

			<nav aria-label="Main Navigation">
				<ul>
					<li><a href="/image-editor" use:randomUnderline>Image Edition</a></li>
					<li><a href="/scan-to-pdf" use:randomUnderline>Scan Image</a></li>
					<li><a href="/images-to-pdf" use:randomUnderline>Images to PDF</a></li>
					<!-- Add more links here later -->
					<!-- <li><a href="/about">About</a></li> -->
				</ul>
			</nav>
		</div>
	</div>
</header>

<style>
	header {
		background-color: var(--mantle);
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--crust);
		position: sticky;
		top: 0;
		z-index: 10;
		width: 100%;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		align-items: center;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 1.8rem;
	}

	/* Logo Styling */
	.logo-link {
		display: flex;
		align-items: center;
		gap: 0.6rem; /* Slightly increased gap */
		text-decoration: none;
	}

	.logo-icon {
		font-size: 1.7rem; /* CHANGED: Increased icon size */
		line-height: 1;
		color: var(--mauve);
		transition: color var(--transition-speed) ease;
	}

	.logo-text {
		font-family: var(--font-header);
		font-size: 1.25rem; /* CHANGED: Increased text size */
		color: var(--overlay);
		font-weight: 600; /* CHANGED: Made bolder (Semi-Bold) */
		margin: 0;
		transition: color var(--transition-speed) ease;
	}

	.logo-link:hover .logo-icon {
		color: var(--pink);
	}
	.logo-link:hover .logo-text {
		color: var(--base);
	}

	/* Navigation Styling */
	nav ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		gap: 1.5rem; /* Increased gap between links slightly */
		align-items: center;
	}

	nav li {
		margin: 0;
	}

	nav a {
		font-family: var(--font-body);
		text-decoration: none;
		color: var(--overlay);
		font-size: 1.05rem; /* CHANGED: Increased nav link size */
		font-weight: 600; /* CHANGED: Made bolder (Semi-Bold) */
		padding: 0.3rem 0.1rem; /* Adjusted horizontal padding slightly for underline space */
		position: relative; /* ADDED: Needed for absolute positioning of ::after */
		transition: color var(--transition-speed) ease;
	}

	nav a:hover {
		color: var(--base);
	}

	/* --- ADDED: Underline Effect --- */
	nav a::after {
		content: '';
		position: absolute;
		width: 33%;
		transform: scaleX(0); /* Initially hidden */
		height: 3px; /* Thickness of underline */
		bottom: -1px; /* Position below the text (adjust as needed) */
		left: 0;
		background-color: var(--underline-color);
		transform-origin: bottom right; /* Animation origin */
		transition: transform 0.25s ease-out; /* Animation */
	}

	nav a:hover::after {
		transform: scaleX(1); /* Show on hover */
		transform-origin: bottom left; /* Animate from left to right */
	}
	/* --- End Underline Effect --- */
</style>
