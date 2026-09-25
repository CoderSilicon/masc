<script module lang="ts">
  /** One line of feedback. Exported from a module script so the workbenches can import
   *  the type without duplicating it. */
  export interface LogLine {
    time: string;
    msg: string;
    tone?: 'sys' | 'ok' | 'warn' | 'err';
  }
</script>

<script lang="ts">
  /**
   * A short activity log.
   *
   * Collapsed by default. Most runs finish in a couple of lines, and a permanently open
   * terminal was taking up more space than the actual work.
   */
  let { lines, label = 'Activity' }: { lines: LogLine[]; label?: string } = $props();

  let open = $state(false);
  // Only the tail matters; nobody scrolls a stego log for history.
  let recent = $derived(lines.slice(-6));
</script>

<div class="border border-zinc-800/70">
  <button
    onclick={() => (open = !open)}
    class="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-900/50 transition-colors"
    aria-expanded={open}
  >
    <span class="text-[10px] font-bold tracking-widest text-zinc-600 uppercase">{label}</span>
    {#if !open && recent.length > 0}
      <span class="text-[10px] text-zinc-600 truncate flex-1">{recent.at(-1)?.msg}</span>
    {/if}
    <span class="text-[9px] text-zinc-700 shrink-0">{open ? 'hide' : 'show'}</span>
  </button>

  {#if open}
    <div class="px-3 pb-2.5 space-y-0.5 border-t border-zinc-800/70 pt-2">
      {#each recent as line (line.time + line.msg)}
        <p class="text-[10px] font-mono leading-relaxed flex gap-2">
          <span class="text-zinc-800 shrink-0">{line.time}</span>
          <span
            class={line.tone === 'ok'
              ? 'text-emerald-500'
              : line.tone === 'warn'
                ? 'text-amber-500'
                : line.tone === 'err'
                  ? 'text-red-400'
                  : 'text-zinc-500'}
          >
            {line.msg}
          </span>
        </p>
      {/each}
      {#if recent.length === 0}
        <p class="text-[10px] font-mono text-zinc-700">Nothing yet.</p>
      {/if}
    </div>
  {/if}
</div>
