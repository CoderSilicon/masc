<script lang="ts">
  import { gsap } from "gsap";
  import { Menu, X, ChevronRight } from "lucide-svelte";
  import logo from "$lib/assets/masc.svg";

  // The workbench is the product, so it gets the only button. The rest are plain links
  // and live in the bar rather than competing with a second call to action.
  const links = [
    { label: "How it works", href: "/#how" },
    { label: "Limits", href: "/#limits" },
    { label: "Features", href: "/features" },
    { label: "Documentation", href: "/documentation" }
  ];

  let isMenuOpen = false;
  let mobileMenu: HTMLDivElement;

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    if (isMenuOpen) {
      // 20/20 Rule: 0.2s snap animation
      gsap.fromTo(
        mobileMenu,
        { clipPath: "inset(0 0 100% 0)", opacity: 0 },
        {
          clipPath: "inset(0 0 0% 0)",
          opacity: 1,
          duration: 0.2,
          ease: "power2.out",
        },
      );
    }
  }
</script>

<nav class="hidden md:grid grid-cols-3 items-center bg-zinc-950 px-6 h-16">
  <a href="/" class="flex items-center gap-2.5 w-fit">
    <img src={logo} alt="" class="h-7 w-7" />
    <span class="text-sm text-white jetbrains-mono-400">masc</span>
  </a>

  <ul class="flex justify-center gap-7 text-sm text-zinc-500 jetbrains-mono-200">
    {#each links as link}
      <li>
        <a href={link.href} class="hover:text-emerald-400 transition-colors">{link.label}</a>
      </li>
    {/each}
  </ul>

  <div class="flex justify-end">
    <a
      href="/steg"
      class="px-5 py-2 border border-emerald-500/50 text-emerald-500 font-mono text-xs tracking-widest uppercase hover:bg-emerald-500/10 transition-colors"
    >
      Open workbench
    </a>
  </div>
</nav>

<nav class="md:hidden flex items-center justify-between bg-zinc-950 px-4 h-14 border-b border-zinc-900">
  <a href="/" class="flex items-center gap-2">
    <img src={logo} alt="" class="h-6 w-6" />
  </a>

  <div class="flex items-center gap-1">
    <a
      href="/steg"
      class="px-3 py-1.5 border border-emerald-500/50 text-emerald-500 font-mono text-[10px] tracking-widest uppercase"
    >
      Workbench
    </a>
    <button
      onclick={toggleMenu}
      class="text-zinc-400 p-1.5 active:scale-90 transition-transform"
      aria-label={isMenuOpen ? "Close menu" : "Open menu"}
    >
      {#if isMenuOpen}
        <X size={20} />
      {:else}
        <Menu size={20} />
      {/if}
    </button>
  </div>

  {#if isMenuOpen}
    <div
      bind:this={mobileMenu}
      class="absolute top-14 left-0 w-full bg-zinc-950/95 backdrop-blur-xl z-[100] border-b border-zinc-800 overflow-hidden"
    >
      <div class="flex flex-col px-5 py-3">
        {#each links as link}
          <a
            href={link.href}
            class="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0"
            onclick={() => (isMenuOpen = false)}
          >
            <span class="text-zinc-400 text-sm group-hover:text-emerald-400">{link.label}</span>
            <ChevronRight size={14} class="text-zinc-700" />
          </a>
        {/each}
      </div>
    </div>
  {/if}
</nav>
