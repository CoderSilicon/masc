<script lang="ts">
  /**
   * Features.
   *
   * Every claim here is something the workbench actually does. There is no server, so
   * there is nothing to claim about uptime, compliance or key custody.
   */
  import PageShell from '$lib/components/pages/PageShell.svelte';
  import { Images, FileArchive, Lock, Cpu, WifiOff, Ruler, Eye, Gauge } from 'lucide-svelte';

  const features = [
    {
      icon: Images,
      title: 'Hide a message in a picture',
      body: 'Rewrites one bit of every colour channel. A 12-megapixel phone photo holds roughly 4.5 million characters — about a full novel — with no visible change.',
      note: 'Method A'
    },
    {
      icon: FileArchive,
      title: 'Hide a file inside a file',
      body: 'Attach any file to a picture, PDF or video. The result still opens normally, and extraction gives you back both the hidden file and a clean copy of the cover.',
      note: 'Method B'
    },
    {
      icon: Lock,
      title: 'Optional password protection',
      body: 'Encrypt with AES-256 before hiding, using a key stretched from your password. Without it, anyone who opens the file can read the message — so use it.',
      note: 'Recommended'
    },
    {
      icon: Ruler,
      title: 'Know your room before you type',
      body: 'The app measures capacity the moment you pick a picture and tells you exactly how many characters will fit.',
      note: 'No surprises'
    },
    {
      icon: Eye,
      title: 'Damage is detected, not hidden',
      body: 'Every container carries a checksum. If a file was re-saved or re-compressed, you are told plainly instead of being handed garbled output.',
      note: 'CRC-32'
    },
    {
      icon: WifiOff,
      title: 'Works with the internet off',
      body: 'No upload, no account, no server. Decoding, embedding and encryption all happen on your device, so there is nothing to intercept and nothing to leak.',
      note: 'Fully local'
    },
    {
      icon: Gauge,
      title: 'Never blocks the page',
      body: 'All pixel work happens on a background thread, so a 24-megapixel image does not freeze the interface.',
      note: 'Web Worker'
    },
    {
      icon: Cpu,
      title: 'Two engines, one format',
      body: 'A Rust core compiled to WebAssembly when you build it, with a TypeScript engine that always works. They produce identical files.',
      note: 'Open source'
    }
  ];
</script>

<PageShell
  eyebrow="// Features"
  title="What it does"
  lede="Everything here happens in your browser. There is no server to be fast or slow, and no account to sign up for."
>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {#each features as feature}
      <div class="border border-zinc-800 bg-zinc-900/20 p-5 hover:border-zinc-700 transition-colors">
        <div class="flex items-start justify-between gap-3 mb-3">
          <feature.icon size={16} class="text-emerald-500 shrink-0" />
          <span class="text-[9px] text-zinc-700 uppercase tracking-[0.2em] shrink-0">{feature.note}</span>
        </div>
        <h2 class="text-white text-sm font-bold mb-1.5">{feature.title}</h2>
        <p class="text-xs text-zinc-500 leading-relaxed">{feature.body}</p>
      </div>
    {/each}
  </div>

  <div class="border border-zinc-800 mt-6 p-5">
    <h2 class="text-white text-sm font-bold mb-3">And what it does not do</h2>
    <ul class="space-y-2 text-xs text-zinc-500 list-disc list-inside">
      <li>It does not survive re-compression. A hidden message cannot survive a resize, a re-save or a trip through a social app.</li>
      <li>It does not hide that something is hidden. To a determined analyst, an image with unusual low-bit patterns is suspicious.</li>
      <li>It does not hide file sizes. A picture far larger than its visible content suggests something.</li>
      <li>It does not protect anything without a password. Hiding is not the same as encrypting.</li>
    </ul>
    <p class="text-[11px] text-zinc-600 mt-3 leading-relaxed">
      The <a href="/documentation" class="text-emerald-500 hover:underline">documentation</a> covers
      all of this in detail.
    </p>
  </div>
</PageShell>
