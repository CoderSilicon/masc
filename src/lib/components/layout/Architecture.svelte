<script lang="ts">
  const steps = [
    { id: '01', title: 'Pick a picture', desc: 'Any picture. Bigger holds more.' },
    { id: '02', title: 'Write your message', desc: 'Optionally lock it with a password.' },
    { id: '03', title: 'Bits are rewritten', desc: 'One bit per colour. Invisible to the eye.' },
    { id: '04', title: 'Saved as PNG', desc: 'Lossless, so the message survives.' }
  ];
</script>

<main id="how" class="bg-zinc-950 text-zinc-400 font-sans px-6 md:px-12 py-20 md:py-28 overflow-x-hidden">
  <div class="max-w-4xl mx-auto">
    <p class="text-emerald-500 font-mono text-xs tracking-[0.3em] uppercase mb-2">// How it works</p>
    <h1 class="text-3xl md:text-4xl font-black text-white tracking-tight mb-10">Four steps. Nothing leaves your device.</h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-20">
      {#each steps as step}
        <div class="border border-zinc-800 p-4">
          <span class="text-[10px] font-mono text-zinc-600 block mb-1.5">STEP_{step.id}</span>
          <h2 class="text-white text-sm font-semibold mb-1">{step.title}</h2>
          <p class="text-xs text-zinc-500 leading-relaxed">{step.desc}</p>
        </div>
      {/each}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="border border-red-900/30 bg-red-950/10 p-5">
        <h2 class="text-red-400/80 font-mono uppercase tracking-widest text-xs mb-3">What destroys a hidden message</h2>
        <ul class="space-y-2">
          {#each ['Uploading to X, Discord or Instagram', 'Re-saving from an image editor', 'Resizing or screenshotting', 'Storing as JPEG'] as item}
            <li class="flex gap-2 text-xs text-zinc-400">
              <span class="text-red-900/60">&times;</span>
              {item}
            </li>
          {/each}
        </ul>
      </div>

      <div class="border border-emerald-500/30 bg-emerald-500/[0.04] p-5">
        <h2 class="text-emerald-400 font-mono uppercase tracking-widest text-xs mb-3">What keeps it safe</h2>
        <ul class="space-y-2">
          {#each ['Downloading the file and moving that file', 'PNG only', 'An optional password (AES-256)', 'No server, no upload, no account'] as item}
            <li class="flex gap-2 text-xs text-zinc-300">
              <span class="text-emerald-500">&bull;</span>
              {item}
            </li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
</main>
