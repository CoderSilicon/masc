<script lang="ts">
  import type { Snippet } from "svelte";
  let { children }: { children: Snippet } = $props();
</script>

<button
  class="mt-12 group relative px-10 py-4 bg-emerald-500 text-black font-bold uppercase tracking-widest overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-emerald-500 hover:ring-offset-2 hover:ring-offset-zinc-950"
>
  <span class="relative z-10">
    {@render children()}
  </span>
  <div
    class="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300"
  ></div>
</button>
