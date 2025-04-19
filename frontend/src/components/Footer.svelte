<!-- src/lib/components/Footer.svelte -->
<script>
	const currentYear = new Date().getFullYear();
</script>

<footer class="site-footer">
	<div class="container">
		<div class="footer-grid">
			<div class="footer-column">
				<h3>Tools</h3>
				<ul>
					<li><a href="/image-editor">Image Editor</a></li>
					<li><a href="/images-to-pdf">Images to PDF</a></li>
					<li><a href="/scan-to-pdf">Scan Image</a></li>
				</ul>
			</div>

			<div class="footer-column">
				<h3><a href="/">Homepage</a></h3>
				<ul>
					<li><a href="/image-resize">Image Resize</a></li>
					<li><a href="/image-crop">Image Crop</a></li>
					<li><a href="/image-rotate">Image Rotate</a></li>
				</ul>
			</div>

			<div class="footer-column">
				<h3>Slurp Tools</h3>
				<p class="description">
					Fast, bloat-free tools designed to tackle common image and document tasks
					quickly.
				</p>
				<p class="copyright">© {currentYear} Slurp Tools. All rights reserved.</p>
			</div>
		</div>
	</div>
</footer>

<style>
	.site-footer {
		background-color: var(--crust);
		color: var(--overlay);
		padding: 3rem 0 2rem 0;
		margin-top: auto;
		border-top: 1px solid var(--mantle);
		font-family: var(--font-body);
		font-size: 0.9rem;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.footer-grid {
		display: grid;

		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 2.5rem;
	}

	.footer-column h3 {
		color: var(--base);
		font-family: var(--font-header);
		font-weight: 600;
		font-size: 1rem;
		margin-top: 0;
		margin-bottom: 1rem;
	}

	.footer-column ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.footer-column li {
		margin-bottom: 0.6rem;
	}

	.footer-column a {
		color: var(--overlay);
		text-decoration: none;
		transition: color var(--transition-speed) ease;
	}

	.footer-column a:hover {
		color: var(--base);
		text-decoration: underline;
	}

	.description {
		line-height: 1.6;
		margin-bottom: 1.5rem;
	}

	.copyright {
		margin-top: 1.5rem;
		font-size: 0.85rem;
		color: var(--overlay);
	}

	@media (max-width: 768px) {
		.footer-grid {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
		.site-footer {
			padding: 2rem 0;
		}
	}
</style>
