<!-- src/routes/+layout.svelte -->
<script>
	import '../app.css';
	import Header from '../components/Header.svelte';
	import Footer from '../components/Footer.svelte';
</script>

<div class="app-container">
	<Header />

	<main>
		<slot />
	</main>

	<Footer />
</div>

<style>
	.app-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: var(--base);
	}

	main {
		flex-grow: 1;
		width: 100%;
	}
</style>
