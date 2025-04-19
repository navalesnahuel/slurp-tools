<!-- src/lib/components/ErrorMessageDisplay.svelte -->
<script>
	export let message;

	export let context = 'general';
</script>

{#if message}
	<p class="error-message {context}">
		{message}
	</p>
{/if}

<style>
	.error-message {
		background-color: color-mix(in srgb, var(--red) 15%, transparent);
		color: var(--red);
		border: 1px solid color-mix(in srgb, var(--red) 40%, transparent);
		padding: 0.8rem 1.2rem;
		border-radius: 6px;
		margin: 1rem auto 0 auto;
		text-align: center;
		font-weight: 500;
		font-size: 0.9rem;
		max-width: 90%;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		word-wrap: break-word;
	}

	.error-message.initial {
		margin-top: 1.5rem;
		max-width: 400px;
	}
	.error-message.sidebar {
		margin: 0;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		text-align: left;
		margin-top: 0.5rem;
		background-color: color-mix(in srgb, var(--red) 20%, transparent);
		color: var(--text);
		border-color: var(--red);
		font-size: 0.85rem;
	}
	.error-message.loading {
		margin-top: 1.5rem;
		max-width: 400px;
	}

	@media (max-width: 480px) {
		.error-message {
			font-size: 0.85rem;
			padding: 0.6rem 1rem;
		}
		.error-message.sidebar {
			font-size: 0.8rem;
		}
	}
</style>
