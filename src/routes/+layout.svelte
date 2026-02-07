<script lang="ts">
	import favicon from '$lib/assets/favicon.ico';
  import Navbar from '$lib/components/Navbar.svelte';
	import "../app.css";
	import "../font.scss"

	let { children } = $props();
</script>

<svelte:head>
	<title>Vault256</title>
	<link rel="icon" href={favicon} />
</svelte:head>
<Navbar />

{@render children()}
