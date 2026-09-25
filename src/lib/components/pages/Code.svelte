<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Rendered in a small monospace tag above the block. */
    label?: string;
    children: Snippet;
  }

  let { label = '', children }: Props = $props();
</script>

<div class="border border-zinc-800 bg-black">
  {#if label}
    <div class="px-3 py-1.5 border-b border-zinc-800 text-[9px] text-zinc-600 uppercase tracking-[0.2em]">
      {label}
    </div>
  {/if}
  <pre class="p-4 overflow-x-auto text-[11px] leading-relaxed text-zinc-300"><code>{@render children()}</code></pre>
</div>
