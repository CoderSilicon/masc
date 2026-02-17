<script>
  import Navbar from '$lib/components/ui/Navbar.svelte';

    let { children } = $props();
</script>
<Navbar/>

{@render children()}