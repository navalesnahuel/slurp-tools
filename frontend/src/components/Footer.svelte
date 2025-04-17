<!-- src/lib/components/Footer.svelte -->
<script>
	const currentYear = new Date().getFullYear();
</script>

<footer class="site-footer">
	<div class="container">
		<div class="footer-grid">
			<!-- Column 1: Tools/Site Links -->
			<div class="footer-column">
				<h3>Tools</h3>
				<ul>
					<li><a href="/image-editor">Image Editor</a></li>
					<li><a href="/images-to-pdf">Images to PDF</a></li>
					<li><a href="/scan-to-pdf">Scan Image</a></li>
				</ul>
			</div>

			<!-- Column 2: Social/Connect Links -->
			<div class="footer-column">
				<h3><a href="/">Homepage</a></h3>
				<ul>
					<!-- Replace with your actual link -->
					<li><a href="/image-resize">Image Resize</a></li>
					<li><a href="/image-crop">Image Crop</a></li>
					<li><a href="/image-rotate">Image Rotate</a></li>
					<!-- Add other relevant links -->
					<!-- <li><a href="#" target="_blank" rel="noopener noreferrer">Twitter</a></li> -->
				</ul>
			</div>

			<!-- Column 3: About/Info -->
			<div class="footer-column">
				<h3>Slurp Tools</h3>
				<p class="description">
					Fast, bloat-free tools designed to tackle common image and document tasks
					quickly.
				</p>
				<p class="copyright">© {currentYear} Slurp Tools. All rights reserved.</p>
				<!-- Optional: Add license link later -->
				<!-- <p><a href="/license">Licensing</a></p> -->
			</div>
		</div>
	</div>
</footer>

<style>
	.site-footer {
		background-color: var(--crust); /* Darkest background */
		color: var(--overlay); /* Default text color (light gray) */
		padding: 3rem 0 2rem 0; /* More top padding, less bottom */
		margin-top: auto; /* Push to bottom */
		border-top: 1px solid var(--mantle); /* Slightly lighter border */
		font-family: var(--font-body);
		font-size: 0.9rem; /* Base font size for footer */
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.footer-grid {
		display: grid;
		/* Create 3 columns, allow the last to take more space if needed */
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 2.5rem; /* Space between columns */
	}

	/* Style for each column */
	.footer-column h3 {
		color: var(--base); /* Brighter text for titles */
		font-family: var(--font-header);
		font-weight: 600; /* Bold title */
		font-size: 1rem; /* Slightly larger title */
		margin-top: 0; /* Remove default top margin */
		margin-bottom: 1rem; /* Space below title */
	}

	.footer-column ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.footer-column li {
		margin-bottom: 0.6rem; /* Space between list items */
	}

	.footer-column a {
		color: var(--overlay); /* Link color */
		text-decoration: none;
		transition: color var(--transition-speed) ease;
	}

	.footer-column a:hover {
		color: var(--base); /* Brighter link color on hover */
		text-decoration: underline; /* Underline on hover like inspiration */
	}

	/* Specific styling for the third column's text */
	.description {
		line-height: 1.6;
		margin-bottom: 1.5rem;
	}

	.copyright {
		margin-top: 1.5rem;
		font-size: 0.85rem; /* Slightly smaller copyright */
		color: var(--overlay); /* Ensure color even if default changes */
	}

	/* Responsive: Stack columns on smaller screens */
	@media (max-width: 768px) {
		.footer-grid {
			grid-template-columns: 1fr; /* Single column */
			gap: 2rem; /* Adjust gap for stacked layout */
		}
		.site-footer {
			padding: 2rem 0; /* Adjust padding */
		}
	}
</style>
