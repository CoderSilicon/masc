<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    eyebrow?: string;
    title: string;
    lede?: string;
    children: Snippet;
  }

  let { eyebrow = '', title, lede = '', children }: Props = $props();
</script>

<div class="min-h-screen bg-zinc-950 text-zinc-400 font-mono">
  <div class="max-w-5xl mx-auto px-5 sm:px-8 py-14">
    {#if eyebrow}
      <p class="text-emerald-500 text-[10px] font-bold tracking-[0.3em] uppercase mb-2">{eyebrow}</p>
    {/if}
    <h1 class="text-3xl md:text-4xl font-black text-white tracking-tight">{title}</h1>
    {#if lede}
      <p class="text-sm text-zinc-500 mt-3 max-w-2xl leading-relaxed">{lede}</p>
    {/if}

    <div class="mt-10">
      {@render children()}
    </div>
  </div>
</div>
