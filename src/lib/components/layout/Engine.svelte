<script lang="ts">
  import { Image, Calculator, ChevronRight, Lock } from 'lucide-svelte';

  /**
   * "How much will fit?" — the question everyone actually has, answered with real numbers
   * instead of a decorative fake terminal.
   *
   * A fully opaque picture hides 3 bits per pixel, so capacity in characters is
   * `floor(pixels * 3 / 8)` minus the 20-byte container header. Transparent pixels are
   * skipped, so the calculator assumes none.
   */
  const PRESETS = [
    { label: 'Phone photo', w: 4032, h: 3024 },
    { label: 'Web image', w: 1920, h: 1080 },
    { label: 'Social post', w: 1200, h: 1200 },
    { label: 'Thumbnail', w: 640, h: 480 }
  ];

  let width = $state(1920);
  let height = $state(1080);

  const pixels = $derived(Math.max(0, Math.floor(width) * Math.floor(height)));
  const chars = $derived(Math.max(0, Math.floor((pixels * 3 - 160) / 8)));

  const asText = $derived(
    chars >= 1_000_000
      ? `${(chars / 1_000_000).toFixed(1)} million characters`
      : chars >= 1_000
        ? `${Math.round(chars / 1000).toLocaleString()},000 characters`
        : `${chars} characters`
  );
</script>

<main class="bg-black text-zinc-400 font-mono px-6 md:px-12 py-20 md:py-24">
  <div class="max-w-3xl mx-auto">
    <p class="text-emerald-500 font-mono text-xs tracking-[0.3em] uppercase mb-2">// Capacity</p>
    <h1 class="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
      How much will fit?
    </h1>
    <p class="text-sm text-zinc-500 mb-8 max-w-xl">
      Every colour value is a number from 0 to 255, stored as 8 binary digits. We overwrite
      the very last digit of each red, green and blue with a piece of your message — so one
      pixel carries three digits.
    </p>

    <div class="border border-zinc-800 p-5 mb-3">
      <div class="flex items-center gap-2 mb-4">
        <Calculator size={14} class="text-emerald-500" />
        <span class="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">Try your picture</span>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-4">
        <label class="block">
          <span class="text-[10px] text-zinc-600 uppercase tracking-widest block mb-1">Width</span>
          <input
            type="number"
            min="1"
            bind:value={width}
            class="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-sm text-white font-mono
              focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </label>
        <label class="block">
          <span class="text-[10px] text-zinc-600 uppercase tracking-widest block mb-1">Height</span>
          <input
            type="number"
            min="1"
            bind:value={height}
            class="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-sm text-white font-mono
              focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </label>
      </div>

      <div class="flex flex-wrap gap-1.5 mb-4">
        {#each PRESETS as preset}
          <button
            onclick={() => {
              width = preset.w;
              height = preset.h;
            }}
            class="px-2.5 py-1 border border-zinc-800 text-[10px] text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/50 transition-colors"
          >
            {preset.label}
          </button>
        {/each}
      </div>

      <div class="border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <p class="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Room for roughly</p>
        <p class="text-2xl text-emerald-400 font-mono">{asText}</p>
        <p class="text-[10px] text-zinc-600 mt-1.5">
          {pixels.toLocaleString()} pixels × 3 digits each
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="border border-zinc-900 p-4">
        <Image size={14} class="text-zinc-600 mb-2" />
        <p class="text-white text-xs font-semibold mb-1">PNG only</p>
        <p class="text-[11px] text-zinc-500 leading-relaxed">
          JPEG squashes colours and destroys the last digit. PNG keeps every value exact.
        </p>
      </div>
      <div class="border border-zinc-900 p-4">
        <Lock size={14} class="text-zinc-600 mb-2" />
        <p class="text-white text-xs font-semibold mb-1">Add a password</p>
        <p class="text-[11px] text-zinc-500 leading-relaxed">
          Locks the message with AES-256 before hiding it, so the picture alone reveals nothing.
        </p>
      </div>
      <div class="border border-zinc-900 p-4">
        <ChevronRight size={14} class="text-zinc-600 mb-2" />
        <p class="text-white text-xs font-semibold mb-1">No upload</p>
        <p class="text-[11px] text-zinc-500 leading-relaxed">
          Decoding and encryption run on your device. Turn off your internet and it still works.
        </p>
      </div>
    </div>
  </div>
</main>
