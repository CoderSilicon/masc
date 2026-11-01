<script lang="ts">
  import DropZone from './DropZone.svelte';
  import { formatBytes } from '$lib/steg/image';
  import { PictureWorkbench, type Mode } from './picture.svelte';

  const wb = new PictureWorkbench();

  const imageTypes = 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif';
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
      <div class="space-y-2">
        <DropZone
          label="Cover image"
          accept={imageTypes}
          file={wb.coverFile}
          onselect={(file) => wb.chooseCover(file)}
          onclear={() => wb.clearCover()}
        />

        {#if wb.capacity}
          <p class="text-xs text-zinc-600">{wb.capacityLabel} available</p>
        {/if}
      </div>

      <div class="space-y-3">
        <textarea
          bind:value={wb.message}
          rows="7"
          placeholder="Message to hide"
          class="w-full resize-y border border-zinc-800 bg-transparent p-3 font-mono text-sm text-white
            placeholder-zinc-700 outline-none transition-colors focus:border-zinc-500"
        ></textarea>

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
          {wb.busy ? 'Working…' : 'Hide message'}
        </button>

        {#if wb.result}
          <button
            type="button"
            onclick={() => wb.downloadResult()}
            class="w-full border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 transition-colors
              hover:border-zinc-500 hover:text-white"
          >
            Download · {formatBytes(wb.result.size)}
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="grid gap-8 md:grid-cols-2">
      <div class="space-y-3">
        <DropZone
          label="Image to inspect"
          accept={imageTypes}
          file={wb.carrierFile}
          onselect={(file) => wb.chooseCarrier(file)}
          onclear={() => wb.clearCarrier()}
        />

        {#if wb.locked}
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
            class="w-full bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors
              hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            Unlock
          </button>
        {/if}
      </div>

      <div class="space-y-3">
        {#if wb.recovered}
          <pre
            class="max-h-64 min-h-40 overflow-y-auto whitespace-pre-wrap wrap-break-word border border-zinc-800
              bg-black p-4 font-mono text-sm text-zinc-200">{wb.recovered}</pre>

          <div class="flex gap-2">
            <button
              type="button"
              onclick={() => wb.copy()}
              class="flex-1 border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors
                hover:border-zinc-600 hover:text-white"
            >
              Copy
            </button>

            <button
              type="button"
              onclick={() => wb.saveRecovered()}
              class="flex-1 border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors
                hover:border-zinc-600 hover:text-white"
            >
              Save
            </button>
          </div>
        {:else}
          <p class="text-sm text-zinc-600">
            {wb.busy ? 'Reading image…' : 'Nothing to show yet.'}
          </p>
        {/if}
      </div>
    </div>
  {/if}

  {#if wb.error}
    <p class="text-xs text-zinc-400">{wb.error}</p>
  {:else if wb.notice}
    <p class="text-xs text-zinc-600">{wb.notice}</p>
  {/if}
</div>
