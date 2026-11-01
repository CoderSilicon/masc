
<script lang="ts">
  const steps = [
    {
      id: '01',
      title: 'Select an image',
      desc: 'Choose a PNG image. Larger dimensions allow more data to be embedded.',
    },
    {
      id: '02',
      title: 'Enter your payload',
      desc: 'Write your message and optionally protect it with a password.',
    },
    {
      id: '03',
      title: 'Encode the data',
      desc: 'Bits are embedded into pixel colour values using least significant bits.',
    },
    {
      id: '04',
      title: 'Export the result',
      desc: 'Download the encoded image as PNG to preserve the hidden data.',
    }
  ];

  const destroys = [
    'Social media image compression',
    'Re-saving through image editors',
    'Resizing or taking screenshots',
    'Converting to JPEG'
  ];

  const preserves = [
    'Moving the original downloaded file',
    'Keeping the image in PNG format',
    'Using the optional encryption password',
    'Processing locally on your device'
  ];
</script>

<main id="how" class="relative overflow-hidden bg-[#0b0c0b] px-6 py-28 text-[#e8eae5] md:px-14 md:py-36">

  <div class="relative mx-auto max-w-300">

    <!-- Section heading -->
    <div class="mb-20 flex flex-col justify-between gap-8 md:flex-row md:items-end">

      <div>

        <h1 class="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.05em] md:text-6xl">
          Behind the
          <span class="text-zinc-500"> concealment.</span>
        </h1>
      </div>


    </div>

    <!-- Process timeline -->
    <div class="relative mb-28">

      <div class="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">

        {#each steps as step, i}
          <div class="relative group">

            <!-- Connecting line -->
            <div class="absolute left-0 top-4.75 hidden h-px w-full bg-white/10 lg:block"></div>

            <div class="relative z-10 mb-8 flex items-center gap-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center border border-white/20 bg-[#0b0c0b] font-mono text-xs text-emerald-400 transition-colors group-hover:border-emerald-400">
                {step.id}
              </div>
            </div>

            <div class="pr-8">
              <h2 class="mb-3 text-lg font-medium tracking-tight text-white">
                {step.title}
              </h2>
              <p class="max-w-60 text-sm leading-6 text-zinc-500">
                {step.desc}
              </p>
            </div>

          </div>
        {/each}

      </div>
    </div>

    <!-- File integrity -->
    <div class=" pt-8">

      <div class="mb-10 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Not every operation is harmless.
          </h2>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-px bg-white/10 md:grid-cols-2">

        <!-- Destructive operations -->
        <div class="bg-[#0b0c0b] p-6 md:p-9">
          <div class="mb-8 flex items-center justify-between">
            <h3 class="text-sm font-medium text-zinc-300">
              Data corruption risks
            </h3>
            <span class="font-mono text-[10px] text-red-400/80">RISK</span>
          </div>

          <ul class="space-y-5">
            {#each destroys as item}
              <li class="flex items-center gap-4 text-sm text-zinc-500">
                <span class="font-mono text-xs text-red-400/70">−</span>
                {item}
              </li>
            {/each}
          </ul>
        </div>

        <!-- Safe operations -->
        <div class="bg-[#0b0c0b] p-6 md:p-9">
          <div class="mb-8 flex items-center justify-between">
            <h3 class="text-sm font-medium text-zinc-300">
              Preservation practices
            </h3>
            <span class="font-mono text-[10px] text-emerald-400">SAFE</span>
          </div>

          <ul class="space-y-5">
            {#each preserves as item}
              <li class="flex items-center gap-4 text-sm text-zinc-400">
                <span class="font-mono text-xs text-emerald-400">+</span>
                {item}
              </li>
            {/each}
          </ul>
        </div>

      </div>
    </div>


  </div>
</main>
