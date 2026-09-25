<script lang="ts">
  /**
   * Pricing.
   *
   * There is no server, so there is no per-user cost to pass on. Inventing paid tiers for
   * something that costs nothing to run would be dishonest, so this page says what the
   * situation actually is.
   */
  import PageShell from '$lib/components/pages/PageShell.svelte';
  import { Check, X } from 'lucide-svelte';

  const included = [
    'Both hiding methods, with no limits on size or count',
    'Password protection on every message and file',
    'Reading files made by other steganography tools',
    'Unlimited use, with no account and no sign-in',
    'The source code and the file format specification'
  ];

  const neverCharged = [
    'No paid tier, and no plan that unlocks more of the tool',
    'No upload limit, because nothing is ever uploaded',
    'No “premium” password option — AES-256 for everyone',
    'No telemetry, advertising or third-party trackers'
  ];
</script>

<PageShell
  eyebrow="// Pricing"
  title="Free, and staying that way"
  lede="Everything runs on your device, so there is no server bill to pass on to you. There is no paid tier and nothing to upgrade to."
>
  <div class="border border-emerald-500/30 bg-emerald-500/[0.04] p-6 max-w-2xl">
    <p class="text-4xl font-black text-white mb-1">
      £0<span class="text-sm text-zinc-600 font-normal italic ml-2">/ forever</span>
    </p>
    <p class="text-xs text-zinc-400 leading-relaxed">
      No account. No card. No trial that expires.
    </p>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mt-5">
    <div class="border border-zinc-800 p-5">
      <p class="text-emerald-400 text-xs font-bold mb-3">What you get</p>
      <ul class="space-y-2">
        {#each included as item}
          <li class="flex gap-2.5 text-[11px] text-zinc-400 leading-relaxed">
            <Check size={13} class="text-emerald-500 shrink-0 mt-0.5" />
            {item}
          </li>
        {/each}
      </ul>
    </div>

    <div class="border border-zinc-800 p-5">
      <p class="text-zinc-300 text-xs font-bold mb-3">What you will never pay for</p>
      <ul class="space-y-2">
        {#each neverCharged as item}
          <li class="flex gap-2.5 text-[11px] text-zinc-400 leading-relaxed">
            <X size={13} class="text-zinc-600 shrink-0 mt-0.5" />
            {item}
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <div class="border border-zinc-800 p-5 max-w-2xl mt-5">
    <p class="text-xs text-zinc-300 font-bold mb-2">If this ever changes</p>
    <p class="text-[11px] text-zinc-500 leading-relaxed">
      The only way a version of this could start costing money is if hosting or a third-party
      service were added — which would mean your files leaving your device. If that ever happens
      it would be a separate, opt-in product, and the version you have now would keep working
      exactly as it does. Nothing here depends on a company, an account or a payment.
    </p>
  </div>
</PageShell>
