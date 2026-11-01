
<script lang="ts">
  import { TriangleAlert, Lock, EyeOff } from 'lucide-svelte';

  const points = [
    {
      id: '01',
      icon: EyeOff,
      label: 'VISIBILITY',
      title: 'Hidden is not encrypted.',
      body: 'Without a password, anyone with access to the image and this tool can extract the message. Steganography conceals the existence of data; encryption protects its contents. Use a password when confidentiality matters.',
      status: 'NO PASSWORD = NO ENCRYPTION'
    },
    {
      id: '02',
      icon: TriangleAlert,
      label: 'FILE INTEGRITY',
      title: 'The payload is fragile.',
      body: 'The message is embedded in the exact pixel values of the carrier image. Re-compressing, resizing, editing or screenshotting can corrupt or destroy it. Always preserve the original encoded file.',
      status: 'ORIGINAL FILE REQUIRED'
    },
    {
      id: '03',
      icon: Lock,
      label: 'DATA HANDLING',
      title: 'Processing stays local.',
      body: 'Embedding, extraction and encryption run on your device. The application does not need to upload your image, message or password to a remote server.',
      status: 'LOCAL PROCESSING'
    }
  ];
</script>

<main id="limits" class="relative overflow-hidden bg-[#0b0c0b] px-6 py-28 text-[#e8eae5] md:px-14 md:py-36">

  <div class="mx-auto max-w-280">

    <!-- Heading -->
    <div class="mb-20 grid grid-cols-1 gap-8 md:grid-cols-[1fr_300px] md:items-end">

      <div>

        <h1 class="max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-7xl">
          Know the
          <span class="text-zinc-500"> limitations.</span>
        </h1>
      </div>
    </div>

    <!-- Disclosures -->
    <div>

      {#each points as point}
        <article class="group grid grid-cols-[44px_1fr] gap-5 py-9 md:grid-cols-[90px_1fr_200px] md:gap-8 md:py-11">

          <!-- Number -->
          <div class="font-mono text-2xl tracking-tight text-zinc-700 transition-colors group-hover:text-emerald-400 md:text-3xl">
            {point.id}
          </div>

          <!-- Content -->
          <div>
            <div class="mb-4 flex items-center gap-3">
              <point.icon size={15} class="text-zinc-500" />
              <span class="font-mono text-[10px]  tracking-[0.18em] text-zinc-500">
                {point.label}
              </span>
            </div>

            <h2 class="mb-3 text-xl font-medium tracking-tight text-white md:text-2xl">
              {point.title}
            </h2>

            <p class="max-w-2xl text-sm leading-7 text-zinc-500">
              {point.body}
            </p>

            <!-- Mobile status -->
            <div class="mt-5 md:hidden">
              <span class="font-mono text-[9px] tracking-widest text-zinc-600">
                {point.status}
              </span>
            </div>
          </div>

          <!-- Technical status -->
          <div class="hidden items-start justify-end pt-1 md:flex">
            <span class="border border-white/10 px-3 py-2 font-mono text-[9px] tracking-wider text-zinc-500">
              {point.status}
            </span>
          </div>

        </article>
      {/each}

    </div>

    <!-- Closing statement -->
    <div class="mt-16 flex flex-col gap-5 border-l-2 border-emerald-400 pl-6 md:flex-row md:items-center md:justify-between md:gap-12">

      <div>
        <p class="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
          Important distinction
        </p>

        <p class="max-w-2xl text-lg font-medium leading-7 tracking-tight text-white md:text-xl">
          Steganography hides the message.
          <span class="text-zinc-500"> Encryption protects what's inside it.</span>
        </p>
      </div>

    </div>

  </div>
</main>
