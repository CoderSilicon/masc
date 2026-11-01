<script lang="ts">
  import Workbench from '$lib/components/steg/Workbench.svelte';
  import logo from '$lib/assets/masc.svg';
</script>

<div class="min-h-screen bg-black text-zinc-100 antialiased">
  <header class="border-b border-zinc-900">
    <div class="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-5">
      <a href="/" class="flex items-center gap-2.5">
        <img src={logo} alt="" height="20" width="20" class="opacity-80" />
        <span class="font-mono text-sm text-white">masc</span>
      </a>
      <span class="text-xs text-zinc-600">Welcome to the workbench</span>
    </div>
  </header>

  <main class="mx-auto max-w-3xl space-y-10 px-5 py-12">
    <div class="space-y-2">
      <h1 class="text-2xl font-medium tracking-tight text-white">Hide data in plain sight</h1>
      <p class="text-sm text-zinc-500">Everything hereby; runs on your device. No outside connection is made.</p>
    </div>

    <Workbench />

    <p class="border-t border-zinc-900 pt-5 text-xs leading-relaxed text-zinc-600">
      Keep the exact file you download. Re-saving or compressing it destroys the hidden data.
      Hiding is not locking — add a password if the message must stay private.
    </p>
  </main>
</div>
