<script lang="ts">
  import Intro from "$lib/components/layout/Intro.svelte";
  import Architecture from "$lib/components/layout/Architecture.svelte";
  import Engine from "$lib/components/layout/Engine.svelte";
  import Immunity from "$lib/components/layout/Immunity.svelte";
  import Ready from "$lib/components/layout/Ready.svelte";
</script>

<Intro /><Architecture /><Engine /><Immunity /><Ready />

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
