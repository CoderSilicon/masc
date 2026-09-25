<script lang="ts">
  import { TriangleAlert, Lock, EyeOff } from 'lucide-svelte';

  const points = [
    {
      icon: EyeOff,
      title: 'Hidden, not locked',
      body: 'Without a password, anyone who can run this page reads the message. There is no key to steal, because there is no key. Add a password and the message is encrypted before it is hidden.'
    },
    {
      icon: TriangleAlert,
      title: 'Fragile by nature',
      body: 'A hidden message lives in the exact pixel values of one file. Re-compress it, resize it, or screenshot it and the message is gone. There is no second copy.'
    },
    {
      icon: Lock,
      title: 'Private by default',
      body: 'Decoding, embedding and encryption all run on your device. No image, message or password is ever sent anywhere, so there is nothing to leak.'
    }
  ];
</script>

<main class="bg-zinc-950 text-zinc-400 font-mono px-6 md:px-12 py-20 md:py-24" id="limits">
  <div class="max-w-3xl mx-auto">
    <p class="text-emerald-500 font-mono text-xs tracking-[0.3em] uppercase mb-2">// Limits</p>
    <h1 class="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">What this tool cannot do</h1>
    <p class="text-sm text-zinc-500 mb-10 max-w-xl">
      Steganography is a way of hiding, not a way of protecting. It is worth being clear
      about that before you rely on it.
    </p>

    <div class="space-y-3">
      {#each points as point}
        <div class="border border-zinc-800 p-5 flex gap-4">
          <point.icon size={18} class="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h2 class="text-white text-sm font-semibold mb-1">{point.title}</h2>
            <p class="text-xs text-zinc-400 leading-relaxed">{point.body}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</main>
