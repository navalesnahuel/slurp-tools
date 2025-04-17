<!-- src/lib/components/ToolCard.svelte -->
<script>
	import { fly } from 'svelte/transition'; // Import transition
    import { quintOut } from 'svelte/easing'; // Import an easing function

	export let title = 'Tool Title';
	export let description = 'A short, clear description of what this amazing tool does.';
	export let link = '#';
	export let icon = '✨';
	export let comingSoon = false;
	export let accentColor = 'green';
    export let delay = 0; // Add delay prop for staggered animation
</script>

<!-- Add entrance transition -->
<a
	href={comingSoon ? '#' : link}
	class="tool-card"
	class:coming-soon={comingSoon}
	title={comingSoon ? `${title} (Coming Soon)` : title}
	style="--card-accent: var(--{accentColor});"
    in:fly={{ y: 40, duration: 500, delay: delay, easing: quintOut }}
    out:fly={{ duration: 100 }}  
>
    <!-- Shine Effect Pseudo Element Container -->
    <div class="shine-container"></div>

	<div class="card-content">
		<div class="icon-wrapper">
			<span class="icon">{icon}</span>
		</div>
		<div class="text-content">
			<h3 class="title">{title}</h3>
			<p class="description">{description}</p>
		</div>
	</div>

	{#if comingSoon}
		<span class="status-badge">Coming Soon</span>
	{/if}
</a>

<style>
	.tool-card {
		display: block;
		background-color: var(--overlay);
		color: var(--text);
		border-radius: 10px;
		padding: 1.8rem 1.5rem;
		text-decoration: none;
        /* 1. Persistent Accent Border */
        border-top: 4px solid var(--card-accent);
        border-left: 1px solid transparent; /* Keep others thin/transparent */
        border-right: 1px solid transparent;
        border-bottom: 1px solid transparent;
		transition:
			transform 0.25s ease-out,
			box-shadow 0.3s ease-out,
            background-color 0.25s ease-out; /* Removed border-color */
		position: relative;
		overflow: hidden; /* Important for shine effect */
		height: 100%;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
	}

    /* Container for Shine Pseudo-element */
    .shine-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: hidden; /* Clip the shine element */
        pointer-events: none; /* Make it non-interactive */
        border-radius: इन्हेरिट; /* Match parent rounding */
    }

     /* Shine Pseudo Element (using ::after on the container) */
    .shine-container::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -75%;
        width: 50%; /* Width of the shine */
        height: 200%; /* Tall enough to cover card height */
        background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.15) 50%, /* Subtle white shine */
            rgba(255, 255, 255, 0) 100%
        );
        transform: rotate(25deg); /* Angle the shine */
        opacity: 0;
        transition: transform 0.6s ease-out, opacity 0.6s ease-out;
        pointer-events: none;
    }

	/* 2. Enhanced Hover State */
	.tool-card:not(.coming-soon):hover,
    .tool-card:not(.coming-soon):focus-visible {
		transform: translateY(-8px); /* More lift */
        /* Subtle gradient background on hover */
        background: linear-gradient(145deg, var(--base) 70%, color-mix(in srgb, var(--card-accent) 15%, var(--base)));
        /* Glow Effect using box-shadow */
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12), 0 0 20px -5px color-mix(in srgb, var(--card-accent) 50%, transparent);
	}
    /* Trigger Shine Animation on Hover */
    .tool-card:not(.coming-soon):hover .shine-container::after {
        transform: translate(300px, 0) rotate(25deg); /* Move shine across */
        opacity: 1;
        transition-duration: 0.8s; /* Slower shine move */
    }


    .tool-card:focus-visible {
        outline: 2px solid var(--card-accent);
        outline-offset: 3px;
    }


	/* Content Layout */
	.card-content {
		display: flex;
		flex-direction: column;
		height: 100%;
        position: relative; /* Ensure content is above shine */
        z-index: 1;
	}

	/* Icon Styling & Animation */
	.icon-wrapper {
		margin-bottom: 1.2rem;
	}
	.icon {
		font-size: 2.8rem;
		line-height: 1;
		color: var(--card-accent);
		display: inline-block;
        transition: transform 0.3s ease-out; /* Add transition for icon */
	}
    /* Icon animation on hover */
    .tool-card:not(.coming-soon):hover .icon {
         transform: scale(1.15) rotate(-5deg);
    }


	/* Text Content Styling */
	.text-content { flex-grow: 1; display: flex; flex-direction: column; }
	.title {
		font-family: var(--font-header);
		font-size: 1.4rem;
		font-weight: 600;
		color: var(--card-accent);
		margin: 0 0 0.6rem 0;
		line-height: 1.3;
	}
	.description {
		font-family: var(--font-body);
		font-size: 0.95rem;
		color: var(--text);
		line-height: 1.6;
		margin: 0;
		flex-grow: 1;
	}

	/* Coming Soon Badge */
	.status-badge {
        /* Keep styles from before */
		position: absolute;
		top: 12px;
		right: 12px;
		background-color: var(--yellow);
		color: var(--text);
		padding: 0.3rem 0.7rem;
		border-radius: 50px;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
        z-index: 2; /* Above shine effect */
	}

	/* Coming Soon State */
	.tool-card.coming-soon {
		opacity: 0.6; /* Slightly less opacity */
		cursor: not-allowed;
		box-shadow: none;
        border-top-color: var(--overlay); /* Dull the top border */
	}
	.tool-card.coming-soon:hover {
		transform: none;
		background: var(--overlay); /* Ensure background doesn't change */
		box-shadow: none;
	}
    /* Prevent icon animation on coming soon */
     .tool-card.coming-soon:hover .icon {
         transform: none;
     }
     /* Ensure shine doesn't happen on coming soon */
     .tool-card.coming-soon .shine-container::after {
          display: none;
     }

</style>
