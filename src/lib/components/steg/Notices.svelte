<script lang="ts">
  /**
   * The three things worth knowing before you hide something.
   *
   * Kept short and always visible. This is the one panel in the app that is not
   * dismissible: every one of these mistakes silently destroys the hidden data.
   */
  import { TriangleAlert, Lock, Cpu } from 'lucide-svelte';

  const points = [
    {
      icon: TriangleAlert,
      tone: 'text-amber-500',
      title: 'Keep the file exactly as downloaded',
      body: 'Any app that re-saves the picture — X, Discord, Instagram, or just resizing it — wipes the hidden message. Download the file and move that file.'
    },
    {
      icon: Lock,
      tone: 'text-emerald-500',
      title: 'Hiding is not the same as locking',
      body: 'Anyone who has this page can read a message you hide without a password. Add a password to make it unreadable without it.'
    },
    {
      icon: Cpu,
      tone: 'text-zinc-500',
      title: 'Nothing is uploaded',
      body: 'Hiding, reading and encrypting all happen on this device. You can turn off your internet and it still works.'
    }
  ];
</script>

<div class="border border-amber-500/25 bg-amber-500/[0.04]">
  <div class="divide-y divide-amber-500/10">
    {#each points as point}
      <div class="flex gap-3 px-4 py-3">
        <point.icon size={15} class="{point.tone} shrink-0 mt-0.5" />
        <p class="text-xs leading-relaxed text-zinc-400">
          <span class="text-zinc-200 font-medium">{point.title}.</span>
          {point.body}
        </p>
      </div>
    {/each}
  </div>
</div>
