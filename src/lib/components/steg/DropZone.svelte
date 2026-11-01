<script lang="ts">
  import { formatBytes } from '$lib/steg/image';

  interface Props {
    label: string;
    accept?: string;
    file?: File | null;
    disabled?: boolean;
    onselect: (file: File) => void;
    onclear?: () => void;
  }

  let { label, accept = '', file = null, disabled = false, onselect, onclear }: Props = $props();

  let input: HTMLInputElement;
  let dragging = $state(false);

  function take(files: FileList | null) {
    const picked = files?.[0];
    if (picked) onselect(picked);
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    if (!disabled) take(event.dataTransfer?.files ?? null);
  }

  function clear() {
    onclear?.();
    if (input) input.value = '';
  }
</script>

<div>
  <button
    type="button"
    onclick={() => input.click()}
    ondragover={(event) => {
      event.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={drop}
    {disabled}
    class="w-full border border-dashed px-4 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50
      {dragging ? 'border-zinc-400' : 'border-zinc-800 hover:border-zinc-600'}"
  >
    <span class="block text-sm text-zinc-200">{label}</span>

    {#if file}
      <span class="mt-1 block truncate text-xs text-zinc-500">
        {file.name} · {formatBytes(file.size)}
      </span>
    {:else}
      <span class="mt-1 block text-xs text-zinc-600">Drop a file or click to browse</span>
    {/if}
  </button>

  {#if file && onclear}
    <button
      type="button"
      onclick={clear}
      class="mt-2 text-xs text-zinc-600 transition-colors hover:text-zinc-300"
    >
      Remove
    </button>
  {/if}

  <input
    bind:this={input}
    type="file"
    {accept}
    class="hidden"
    onchange={(event) => take(event.currentTarget.files)}
  />
</div>
