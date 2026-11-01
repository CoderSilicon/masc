<script lang="ts">
  import PicturePanel from './PicturePanel.svelte';
  import FilePanel from './FilePanel.svelte';

  type Method = 'picture' | 'file';

  let method = $state<Method>('picture');

  const methods: Array<[Method, string]> = [
    ['picture', 'In a picture'],
    ['file', 'Inside a file']
  ];
</script>

<div class="space-y-8">
  <div class="flex gap-6 text-sm">
    {#each methods as [id, label]}
      <button
        type="button"
        onclick={() => (method = id)}
        class="transition-colors
          {method === id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}"
      >
        {label}
      </button>
    {/each}
  </div>

  {#if method === 'picture'}
    <PicturePanel />
  {:else}
    <FilePanel />
  {/if}
</div>
