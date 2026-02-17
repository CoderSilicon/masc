<script lang="ts">
  import { gsap } from "gsap";
  import { Menu, X, Terminal, ChevronRight } from "lucide-svelte";
  import logo from "$lib/assets/256.svg";

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

<nav class="hidden md:grid grid-cols-3 items-center bg-zinc-950 p-4">
  <a href="/">
    <div class="flex gap-3 mx-2 items-center">
      <img src={logo} alt="logo" class="h-10 w-10" />
      <span class="text-3xl text-white jetbrains-mono-400">Vault256</span>
    </div>
  </a>
  <ul class="flex justify-center gap-6 text-white jetbrains-mono-200">
    <li class="hover:text-emerald-400 cursor-pointer transition-colors">
      <a href="/features">Features</a>
    </li>
    <li class="hover:text-emerald-400 cursor-pointer transition-colors">
      <a href="/about">About</a>
    </li>
    <li class="hover:text-emerald-400 cursor-pointer transition-colors">
      <a href="/pricing">Pricing</a>
    </li>
    <li class="hover:text-emerald-400 cursor-pointer transition-colors">
      <a href="/documentation">Documentation</a>
    </li>
    <li class="hover:text-emerald-400 cursor-pointer transition-colors">
      <a href="/contact">Contact Us</a>
    </li>
  </ul>

  <div class="flex justify-end mx-2">
    <button
      class="px-6 py-2 border border-emerald-500/50 text-emerald-500 font-mono text-xs tracking-widest uppercase hover:bg-emerald-500/10 transition-all duration-300"
    >
      Sign in
    </button>
  </div>
</nav>

<nav
  class="md:hidden flex items-center justify-between bg-zinc-950 p-4 border-b border-emerald-500/20"
>
  <div class="flex items-center gap-2">
    <img src={logo} alt="logo" class="h-8 w-8" />
    <span class="text-xl text-white font-mono tracking-tighter">V256</span>
  </div>

  <button
    on:click={toggleMenu}
    class="text-emerald-500 p-1 active:scale-90 transition-transform"
  >
    {#if isMenuOpen}
      <X size={24} />
    {:else}
      <Menu size={24} />
    {/if}
  </button>

  {#if isMenuOpen}
    <div
      bind:this={mobileMenu}
      class="absolute top-[73px] left-0 w-full bg-zinc-950/95 backdrop-blur-xl z-[100] border-b border-emerald-500/30 overflow-hidden"
    >
      <div class="flex flex-col p-6 space-y-1">
        <div class="flex items-center gap-2 mb-4">
          <Terminal size={12} class="text-emerald-500/50" />
          <span
            class="text-[10px] text-emerald-500/50 uppercase tracking-[0.3em]"
            >System_Navigation</span
          >
        </div>

        {#each ["Features", "About", "Pricing", "Documentation", "Sign In"] as item}
          <a
            href="#{item}"
            class="group flex items-center justify-between py-4 border-b border-white/5 last:border-0"
            on:click={() => (isMenuOpen = false)}
          >
            <span
              class="text-zinc-400 uppercase text-xs tracking-[0.2em] group-hover:text-emerald-400 transition-colors"
            >
              {item}
            </span>
            <ChevronRight
              size={14}
              class="text-emerald-500/30 group-hover:text-emerald-500 transition-colors"
            />
          </a>
        {/each}

        <div class="pt-6 pb-2">
          <div
            class="text-[8px] text-zinc-600 uppercase tracking-widest flex justify-between"
          >
            <span>Status: Operational</span>
            <span>v.1.0.256</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</nav>

<style>
  /* Ensuring fonts are available */
  :global(body) {
    background-color: #09090b; /* zinc-950 */
  }
</style>
