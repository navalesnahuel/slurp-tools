<!-- src/routes/+layout.svelte -->
<script>
	import '../app.css';
	import Header from '../components/Header.svelte';
	import Footer from '../components/Footer.svelte';
</script>

<div class="app-container">
	<Header />

	<main>
		<!-- Ensure this element grows -->
		<slot />
	</main>

	<Footer />
</div>

<style>
	.app-container {
		min-height: 100vh; /* Crucial */
		display: flex;
		flex-direction: column; /* Crucial */
		background-color: var(--base);
	}

	main {
		flex-grow: 1; /* Crucial: Allows main to expand and push footer */
		width: 100%;
		/* max-width/padding already handled inside +page.svelte's sections */
	}
</style>
