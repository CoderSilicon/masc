<script lang="ts">
  import DropZone from './DropZone.svelte';
  import { formatBytes } from '$lib/steg/image';
  import { FileWorkbench, type Mode } from './file.svelte';

  const wb = new FileWorkbench();

  const modes: Array<[Mode, string]> = [
    ['hide', 'Hide'],
    ['reveal', 'Reveal']
  ];
</script>

<div class="space-y-6">
  <div class="flex gap-6 border-b border-zinc-900 text-sm">
    {#each modes as [id, label]}
      <button
        type="button"
        onclick={() => (wb.mode = id)}
        class="-mb-px border-b pb-2 transition-colors
          {wb.mode === id
            ? 'border-white text-white'
            : 'border-transparent text-zinc-500 hover:text-zinc-300'}"
      >
        {label}
      </button>
    {/each}
  </div>

  {#if wb.mode === 'hide'}
    <div class="grid gap-8 md:grid-cols-2">
      <div class="space-y-3">
        <DropZone
          label="Cover file"
          file={wb.coverFile}
          onselect={(file) => wb.chooseCover(file)}
          onclear={() => wb.clearCover()}
        />

        <DropZone
          label="File to hide"
          file={wb.secretFile}
          onselect={(file) => wb.chooseSecret(file)}
          onclear={() => wb.clearSecret()}
        />
      </div>

      <div class="space-y-3">
        <input
          type="password"
          bind:value={wb.password}
          placeholder="Password (optional)"
          class="w-full border border-zinc-800 bg-transparent px-3 py-2.5 font-mono text-sm text-white
            placeholder-zinc-700 outline-none transition-colors focus:border-zinc-500"
        />

        <button
          type="button"
          onclick={() => wb.hide()}
          disabled={!wb.canHide}
          class="w-full bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors
            hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
        >
          {wb.busy ? 'Working…' : 'Hide file'}
        </button>

        {#if wb.result}
          <button
            type="button"
            onclick={() => wb.downloadResult()}
            class="w-full border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 transition-colors
              hover:border-zinc-500 hover:text-white"
          >
            Download · {formatBytes(wb.result.length)}
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="space-y-4">
      <DropZone
        label="File to open"
        file={wb.containerFile}
        onselect={(file) => wb.chooseContainer(file)}
        onclear={() => wb.clearContainer()}
      />

      {#if wb.locked}
        <div class="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            bind:value={wb.readPassword}
            placeholder="Password"
            onkeydown={(event) => event.key === 'Enter' && wb.unlock()}
            class="w-full border border-zinc-800 bg-transparent px-3 py-2.5 font-mono text-sm text-white
              placeholder-zinc-700 outline-none transition-colors focus:border-zinc-500"
          />

          <button
            type="button"
            onclick={() => wb.unlock()}
            disabled={wb.busy || !wb.readPassword}
            class="shrink-0 bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors
              hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            Unlock
          </button>
        </div>
      {/if}

      {#if wb.hidden && !wb.locked}
        <div class="space-y-2 border border-zinc-800 p-4">
          <p class="truncate text-sm text-white">{wb.hidden.name}</p>
          <p class="text-xs text-zinc-500">{formatBytes(wb.hidden.payload.length)}</p>

          <div class="flex gap-2 pt-1">
            <button
              type="button"
              onclick={() => wb.downloadHidden()}
              class="border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors
                hover:border-zinc-600 hover:text-white"
            >
              Save file
            </button>

            {#if wb.restored}
              <button
                type="button"
                onclick={() => wb.downloadRestored()}
                class="border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors
                  hover:border-zinc-600 hover:text-white"
              >
                Save original
              </button>
            {/if}
          </div>
        </div>
      {/if}

      {#if wb.candidates.length}
        <div class="space-y-2">
          <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Found in the extra data</p>

          {#each wb.candidates as candidate (candidate.offset + candidate.kind)}
            <div class="flex items-center justify-between gap-3 border border-zinc-800 px-3 py-2">
              <div class="min-w-0">
                <p class="truncate text-sm text-zinc-300">{candidate.kind}</p>
                <p class="text-xs text-zinc-600">
                  {candidate.length === null ? 'size unknown' : formatBytes(candidate.length)}
                </p>
              </div>

              <button
                type="button"
                onclick={() => wb.downloadCandidate(candidate)}
                class="shrink-0 text-xs text-zinc-400 transition-colors hover:text-white"
              >
                Save
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if wb.error}
    <p class="text-xs text-zinc-400">{wb.error}</p>
  {:else if wb.notice}
    <p class="text-xs text-zinc-600">{wb.notice}</p>
  {/if}
</div>
