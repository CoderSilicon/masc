<script lang="ts">
  import { Upload, X } from 'lucide-svelte';
  import { formatBytes } from '$lib/steg/image';

  interface Props {
    label: string;
    /** `accept` attribute for the file input. Omit for "any file". */
    accept?: string;
    file?: File | null;
    hint?: string;
    disabled?: boolean;
    onselect: (file: File) => void;
    onclear?: () => void;
  }

  let { label, accept = '', file = null, hint = '', disabled = false, onselect, onclear }: Props = $props();

  let dragging = $state(false);
  let input: HTMLInputElement;

  function handleFiles(list: FileList | null) {
    const picked = list?.[0];
    if (picked) onselect(picked);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    if (disabled) return;
    handleFiles(event.dataTransfer?.files ?? null);
  }
</script>

<div>
  <div class="flex items-center justify-between mb-1.5">
    <span class="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">{label}</span>
    {#if file}
      <button
        onclick={() => {
          onclear?.();
          if (input) input.value = '';
        }}
        class="text-zinc-600 hover:text-red-400 transition-colors"
        aria-label="Remove {file.name}"
      >
        <X size={13} />
      </button>
    {/if}
  </div>

  <button
    type="button"
    onclick={() => input.click()}
    ondragover={(e) => {
      e.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={onDrop}
    disabled={disabled}
    class="w-full border border-dashed p-4 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed
      {dragging
      ? 'border-emerald-500 bg-emerald-500/10'
      : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/30'}"
  >
    {#if file}
      <div class="flex items-center gap-2.5">
        <div class="min-w-0 flex-1">
          <p class="text-zinc-200 text-xs font-mono truncate">{file.name}</p>
          <p class="text-zinc-600 text-[10px] font-mono">{formatBytes(file.size)}</p>
        </div>
        <span class="text-[10px] text-zinc-600 shrink-0">Change</span>
      </div>
    {:else}
      <div class="flex items-center gap-2.5">
        <Upload size={16} class="text-zinc-600 shrink-0" />
        <div class="min-w-0">
          <p class="text-zinc-400 text-xs font-mono">Drop a file, or click to choose</p>
          {#if hint}
            <p class="text-zinc-600 text-[10px] mt-0.5">{hint}</p>
          {/if}
        </div>
      </div>
    {/if}
  </button>

  <input
    bind:this={input}
    type="file"
    {accept}
    class="hidden"
    onchange={(e) => handleFiles(e.currentTarget.files)}
  />
</div>
