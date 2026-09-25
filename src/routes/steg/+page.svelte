<script lang="ts">
  /**
   * The steganography workbench.
   *
   * Styled after the `/vault` dashboard, but deliberately spare: two methods, two steps
   * each, and one always-visible warning. All processing happens in a Web Worker on the
   * client — see `src/lib/steg/client.ts`.
   */
  import LsbWorkbench from '$lib/components/steg/LsbWorkbench.svelte';
  import AppendWorkbench from '$lib/components/steg/AppendWorkbench.svelte';
  import Notices from '$lib/components/steg/Notices.svelte';
  import { engineInfo, type EngineInfo } from '$lib/steg/client';
  import { METHOD_A_BLURB, METHOD_B_BLURB } from '$lib/steg/messages';
  import logo from '$lib/assets/masc.svg';
  import { onMount } from 'svelte';

  type Method = 'lsb' | 'append';

  let method: Method = $state('lsb');
  let info: EngineInfo | null = $state(null);

  const METHODS: Array<{ id: Method; label: string; blurb: string }> = [
    { id: 'lsb', label: 'In a picture', blurb: METHOD_A_BLURB },
    { id: 'append', label: 'Inside a file', blurb: METHOD_B_BLURB }
  ];

  // The engine badge is a technical detail; show it only when the compiled Rust core is
  // actually in use, so most visitors never see it.
  onMount(() => {
    let cancelled = false;
    engineInfo()
      .then((value) => {
        if (!cancelled && value.backend === 'wasm') info = value;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  });
</script>

<div class="min-h-screen bg-zinc-950 text-white antialiased">
  <header class="h-14 border-b border-zinc-900 flex items-center justify-between px-5 sm:px-8">
    <a href="/" class="flex items-center gap-2.5">
      <img src={logo} alt="" height="24" width="24" class="opacity-90" />
      <span class="text-sm font-mono text-white">masc</span>
      <span class="text-xs text-zinc-600 font-mono hidden sm:inline">steganography</span>
    </a>

    {#if info}
      <span class="text-[9px] font-mono text-zinc-700 tracking-widest uppercase">rust · wasm</span>
    {/if}
  </header>

  <main class="max-w-4xl mx-auto px-5 sm:px-8 py-8 space-y-5">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight mb-1">Hide data in plain sight</h1>
      <p class="text-sm text-zinc-500">
        Everything runs in your browser. Nothing is uploaded.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-2">
      {#each METHODS as option}
        <button
          onclick={() => (method = option.id)}
          class="text-left border p-3 transition-colors
            {method === option.id
            ? 'border-emerald-500 bg-emerald-500/[0.06]'
            : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/20'}"
        >
          <span
            class="block text-sm font-medium mb-0.5
              {method === option.id ? 'text-emerald-400' : 'text-zinc-300'}"
          >
            {option.label}
          </span>
          <span class="block text-[11px] text-zinc-500 leading-snug">{option.blurb}</span>
        </button>
      {/each}
    </div>

    {#if method === 'lsb'}
      <LsbWorkbench />
    {:else}
      <AppendWorkbench />
    {/if}

    <Notices />

    <footer class="pt-2 pb-8 text-[10px] font-mono text-zinc-700 space-y-1">
      <p>Format spec: docs/STEGO_FORMAT.md · Core: crates/steg-core (Rust → WebAssembly)</p>
      <p>Steganography hides data. It does not encrypt it — use a password.</p>
    </footer>
  </main>
</div>
