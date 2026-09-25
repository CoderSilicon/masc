<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    tone?: 'ok' | 'fail' | 'idle';
    children: Snippet;
  }

  let { title, tone = 'idle', children }: Props = $props();
</script>

<section
  class="border p-4 flex flex-col
    {tone === 'fail'
    ? 'border-red-500/40 bg-red-500/[0.03]'
    : tone === 'ok'
      ? 'border-zinc-800 bg-zinc-900/20'
      : 'border-zinc-800/70 bg-zinc-900/10'}"
>
  <h2 class="text-[11px] font-bold tracking-wide text-zinc-300 mb-3">{title}</h2>
  {@render children()}
</section>
