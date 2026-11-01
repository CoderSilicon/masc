<script lang="ts">
  import { Image, Calculator, Lock, ChevronRight } from "lucide-svelte";

  const PRESETS = [
    { label: "Phone", w: 4032, h: 3024 },
    { label: "Full HD", w: 1920, h: 1080 },
    { label: "Square", w: 1200, h: 1200 },
    { label: "Thumbnail", w: 640, h: 480 },
  ];

  let width = $state(1920);
  let height = $state(1080);

  const safeWidth = $derived(
    Number.isFinite(Number(width)) ? Math.max(0, Math.floor(Number(width))) : 0,
  );

  const safeHeight = $derived(
    Number.isFinite(Number(height))
      ? Math.max(0, Math.floor(Number(height)))
      : 0,
  );

  const pixels = $derived(safeWidth * safeHeight);

  // 3 LSBs per pixel, minus the 20-byte header.
  const bytes = $derived(Math.max(0, Math.floor((pixels * 3 - 160) / 8)));

  // ASCII uses one byte per character.
  const chars = $derived(bytes);

  const formattedChars = $derived(new Intl.NumberFormat("en-US").format(chars));

  const formattedPixels = $derived(
    new Intl.NumberFormat("en-US").format(pixels),
  );

  const capacityMB = $derived((bytes / 1_000_000).toFixed(2));
</script>

<main
  id="capacity"
  class="relative overflow-hidden bg-[#000000] px-6 py-24 text-[#e8eae5] md:px-14 md:py-32"
>
  <div class="mx-auto max-w-280">
    <!-- Heading -->
    <div
      class="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end"
    >
      <div>
        <h1 class="text-5xl font-semibold tracking-[-0.06em] md:text-7xl">
          How much
          <span class="text-zinc-500"> fits?</span>
        </h1>
      </div>

    </div>

    <!-- Main calculator -->
    <div
      class="grid grid-cols-1 border border-white/10 lg:grid-cols-[1fr_0.9fr]"
    >
      <!-- Inputs -->
      <div class="p-6 md:p-10">
        <div class="mb-10 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Calculator size={16} class="text-emerald-400" />
            <span
              class="font-mono text-[11px] uppercase tracking-widest text-zinc-400"
            >
              Image dimensions
            </span>
          </div>
        </div>

        <!-- Dimension inputs -->
        <div class="grid grid-cols-2 gap-4">
          <label class="block">
            <span
              class="mb-2 block font-mono text-[10px] tracking-widest text-zinc-600"
            >
              Width
            </span>
            <input
              type="number"
              min="1"
              max="100000"
              bind:value={width}
              class="w-full border border-white/10 px-4 py-4 font-mono text-xl text-white outline-none transition-colors focus:border-emerald-400"
            />
          </label>

          <label class="block">
            <span
              class="mb-2 block font-mono text-[10px]  tracking-widest text-zinc-600"
            >
              Height
            </span>
            <input
              type="number"
              min="1"
              max="100000"
              bind:value={height}
              class="w-full border border-white/10 px-4 py-4 font-mono text-xl text-white outline-none transition-colors focus:border-emerald-400"
            />
          </label>
        </div>

        <!-- Presets -->
        <div class="mt-8">
          <p
            class="mb-3 font-mono text-[10px]  tracking-widest text-zinc-600"
          >
            Quick configurations
          </p>

          <div class="flex flex-wrap gap-2">
            {#each PRESETS as preset}
              <button
                onclick={() => {
                  width = preset.w;
                  height = preset.h;
                }}
                aria-pressed={width === preset.w && height === preset.h}
                class="border px-3 py-2 font-mono text-[10px] transition-colors"
                class:border-emerald-400={width === preset.w &&
                  height === preset.h}
                class:text-emerald-400={width === preset.w &&
                  height === preset.h}
                class:border-white={width !== preset.w || height !== preset.h}
                class:text-zinc-500={width !== preset.w || height !== preset.h}
                class:hover:border-white={width !== preset.w ||
                  height !== preset.h}
              >
                {preset.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Calculation -->
        <div class="mt-12 border-t border-white/10 pt-6">
          <div
            class="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-600"
          >
            <span>Encoding model</span>
          </div>

          <div
            class="mt-5 flex items-center gap-3 font-mono text-xs text-zinc-400"
          >
            <span class="text-zinc-600">PIXELS</span>
            <span class="text-white">{formattedPixels}</span>
            <span class="text-zinc-700">×</span>
            <span class="text-emerald-400">3 bits</span>
            <span class="text-zinc-700">/ 8</span>
          </div>

          <p class="mt-3 font-mono text-[10px] text-zinc-600">
            − 20 bytes reserved for container header
          </p>
        </div>
      </div>

      <!-- Result -->
      <div
        class="relative flex flex-col justify-between border-t border-white/10 bg-white/2 p-6 md:p-10 lg:border-l lg:border-t-0"
      >
        <div class="flex items-center justify-between">
          <span
            class="font-mono text-[10px] uppercase tracking-widest text-zinc-500"
          >
            Estimated capacity
          </span>
          <span class="font-mono text-[10px] text-emerald-400"> LIVE </span>
        </div>

        <div class="my-12">
          <p
            class="mb-4 font-mono text-[10px] tracking-widest text-zinc-600"
          >
            Approx. ASCII characters
          </p>

          <div
            class="break-all text-5xl font-medium tracking-[-0.07em] text-emerald-400 md:text-6xl"
          >
            {formattedChars}
          </div>

          <p class="mt-4 font-mono text-xs text-zinc-500">
            {capacityMB} MB of raw payload capacity
          </p>
        </div>

        <div class="border-t border-white/10 pt-5">
          <div
            class="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest"
          >
            <span class="text-zinc-600">Image resolution</span>
            <span class="text-zinc-300">{safeWidth} × {safeHeight}</span>
          </div>

          <div
            class="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest"
          >
            <span class="text-zinc-600">Available channels</span>
            <span class="text-zinc-300">R / G / B</span>
          </div>

          <div
            class="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest"
          >
            <span class="text-zinc-600">Bits per pixel</span>
            <span class="text-emerald-400">03</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Technical notes -->
    <div class="mt-16">
      <div
        class="grid grid-cols-1 gap-8 pt-7 sm:grid-cols-3"
      >
        <div>
          <div class="mb-4 flex items-center gap-3 text-zinc-400">
            <Image size={15} />
            <h2 class="text-sm font-medium text-white">Lossless format</h2>
          </div>
          <p class="text-xs leading-6 text-zinc-500">
            PNG preserves exact pixel values. JPEG compression can destroy
            embedded data.
          </p>
        </div>

        <div>
          <div class="mb-4 flex items-center gap-3 text-zinc-400">
            <Lock size={15} />
            <h2 class="text-sm font-medium text-white">Encryption</h2>
          </div>
          <p class="text-xs leading-6 text-zinc-500">
            Optional AES-256 encryption protects the message before it is
            embedded.
          </p>
        </div>

        <div>
          <div class="mb-4 flex items-center gap-3 text-zinc-400">
            <ChevronRight size={15} />
            <h2 class="text-sm font-medium text-white">Local execution</h2>
          </div>
          <p class="text-xs leading-6 text-zinc-500">
            Encoding and decoding run on your device. No remote upload is
            required.
          </p>
        </div>
      </div>
    </div>
  </div>
</main>
