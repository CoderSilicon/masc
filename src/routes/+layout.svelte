<script lang="ts">
	import favicon from '$lib/assets/favicon.ico';
	import "../app.css";
	import "$lib/styles/font.scss";


	let { children } = $props();
</script>

<svelte:head>
	<title>masc</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
