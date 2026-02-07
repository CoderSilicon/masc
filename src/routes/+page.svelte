<script lang="ts">

  import Intro from "$lib/components/views/Intro.svelte";
  import Architecture from "$lib/components/views/Architecture.svelte";
  import Engine from "$lib/components/views/Engine.svelte";
  import Immunity from "$lib/components/views/Immunity.svelte";
  import Ready from "$lib/components/views/Ready.svelte";

  // Function to simulate a live "shredding" of the input
</script>

<!-- ----- HERO SECTION ----- -->
<Intro />
<!-- ----- ARCHITECTURE SECTION ----- -->
<Architecture />

<!-- ----- ENGINE SECTION ----- -->
<Engine />

<!-- ----- IMMUNITY SECTION ----- -->
<Immunity />

<!-- ----- READY SECTION ----- -->
<Ready />

<style>
  @keyframes progress {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
</style>
