<!-- src/lib/components/Header.svelte -->

<script>
	import { randomUnderline } from '$lib/randomUnderline.js';
</script>

<header>
	<div class="container">
		<div class="header-content">
			<a href="/" class="logo-link" aria-label="Slurp Tools Home">
				<span class="logo-icon" aria-hidden="true">🥤</span>
				<span class="logo-text">Slurp Tools</span>
			</a>

			<nav aria-label="Main Navigation">
				<ul>
					<li><a href="/image-editor" use:randomUnderline>Image Edition</a></li>
					<li><a href="/scan-to-pdf" use:randomUnderline>Scan Image</a></li>
					<li><a href="/images-to-pdf" use:randomUnderline>Images to PDF</a></li>
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

	.logo-link {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		text-decoration: none;
	}

	.logo-icon {
		font-size: 1.7rem;
		line-height: 1;
		color: var(--mauve);
		transition: color var(--transition-speed) ease;
	}

	.logo-text {
		font-family: var(--font-header);
		font-size: 1.25rem;
		color: var(--overlay);
		font-weight: 600;
		margin: 0;
		transition: color var(--transition-speed) ease;
	}

	.logo-link:hover .logo-icon {
		color: var(--pink);
	}
	.logo-link:hover .logo-text {
		color: var(--base);
	}

	nav ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		gap: 1.5rem;
		align-items: center;
	}

	nav li {
		margin: 0;
	}

	nav a {
		font-family: var(--font-body);
		text-decoration: none;
		color: var(--overlay);
		font-size: 1.05rem;
		font-weight: 600;
		padding: 0.3rem 0.1rem;
		position: relative;
		transition: color var(--transition-speed) ease;
	}

	nav a:hover {
		color: var(--base);
	}

	nav a::after {
		content: '';
		position: absolute;
		width: 33%;
		transform: scaleX(0);
		height: 3px;
		bottom: -1px;
		left: 0;
		background-color: var(--underline-color);
		transform-origin: bottom right;
		transition: transform 0.25s ease-out;
	}

	nav a:hover::after {
		transform: scaleX(1);
		transform-origin: bottom left;
	}
</style>
