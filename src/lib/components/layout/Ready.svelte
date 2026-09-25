<script lang="ts">
  import { gsap } from "gsap";
  import ScrambleTextPlugin from "gsap/ScrambleTextPlugin";
  import { ChevronRight } from "lucide-svelte";
  import { onMount } from "svelte";

  gsap.registerPlugin(ScrambleTextPlugin);

  let headline: HTMLHeadingElement;

  // Kept as a small flourish on the final call to action, rather than the whole section.
  onMount(() => {
    gsap.to(headline, {
      duration: 0.8,
      scrambleText: { text: "Ready when you are.", chars: "upperCase", speed: 0.4 },
    });
  });
</script>

<main class="bg-zinc-950 flex items-center justify-center px-6 py-24 font-mono">
  <div class="text-center max-w-md">
    <h1
      bind:this={headline}
      class="text-3xl md:text-4xl font-light text-white mb-4 tracking-tight jetbrains-mono-600"
    >
      Ready when you are.
    </h1>

    <p class="text-zinc-500 text-xs mb-8 leading-relaxed">
      No account, no upload, no server. Open a file and start.
    </p>

    <a
      href="/steg"
      class="group inline-flex items-center gap-2 bg-white text-black px-8 py-3.5 font-bold text-[10px]
        uppercase tracking-[0.4em] transition-all hover:tracking-[0.5em]"
    >
      Open workbench
      <ChevronRight size={14} />
    </a>
  </div>
</main>
