<script>
  import { ShieldAlert } from "lucide-svelte";
  import { Lock } from "lucide-svelte";

  const stats = [
    {
      label: "BRUTE_FORCE_TIME",
      value: "1.1e77 Years",
      desc: "Using every supercomputer on Earth.",
    },
    {
      label: "SURVIVAL_RATE",
      value: "99.99999%",
      desc: "Post-Quantum resistance verified.",
    },
    {
      label: "NODE_REDUNDANCY",
      value: "256x",
      desc: "Distributed shards across the lattice.",
    },
  ];
</script>

<main
  class="min-h-screen bg-zinc-950 text-zinc-400 font-mono p-6 md:p-16 overflow-hidden"
>
  <header class="max-w-6xl mx-auto mb-20">
    <div class="mb-12">
      <h2
        class="text-emerald-500 font-mono text-sm tracking-[0.3em] uppercase mb-2 jetbrains-mono-300"
      >
        // SYSTEM_FLOW
      </h2>
      <h1
        class="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-none mb-8 jetbrains-mono-600"
      >
        Mathematically <br />
        Immune. 
      </h1>
      <p
        class="max-w-2xl text-zinc-500 text-sm leading-relaxed jetbrains-mono-400"
      >
        Vault 256 doesn't just "hide" your data. It subjects it to a level of
        entropy that renders brute-force attempts statistically impossible
        within the lifespan of the known universe.
      </p>
    </div>
  </header>

  <section
    class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-0 border border-zinc-900 mb-20"
  >
    {#each stats as stat}
      <div
        class="p-10 border border-zinc-900 bg-zinc-950/30 group hover:bg-emerald-500/2 transition-colors"
      >
        <p
          class="text-[10px] text-zinc-600 mb-4 font-bold tracking-[0.2em] jetbrains-mono-500"
        >
          {stat.label}
        </p>
        <h3
          class="text-white text-3xl font-black mb-2 group-hover:text-emerald-500 transition-colors jetbrains-mono-600"
        >
          {stat.value}
        </h3>
        <p
          class="text-[10px] text-zinc-500 uppercase leading-tight jetbrains-mono-400"
        >
          {stat.desc}
        </p>
      </div>
    {/each}
  </section>

  <section
    class="max-w-6xl mx-auto border-2 border-zinc-900 p-8 md:p-16 relative"
  >
    <div
      class="absolute inset-0 opacity-5 pointer-events-none"
      style="background-image: radial-gradient(#10b981 0.5px, transparent 0.5px); background-size: 20px 20px;"
    ></div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      <div>
        <h2
          class="text-white text-2xl font-black italic uppercase mb-6 flex items-center gap-3"
        >
          <ShieldAlert class="text-emerald-500" /> Entropy Defense
        </h2>
        <div class="space-y-6">
          <div class="border-l-2 border-emerald-500 pl-6">
            <h4
              class="text-white text-sm font-bold tracking-widest uppercase mb-1 jetbrains-mono-500"
            >
              Zero-Point Sharding
            </h4>
            <p class="text-xs text-zinc-400 jetbrains-mono-400">
              Traditional clouds store files. We store noise. To an attacker,
              your high-res image or sensitive document appears as 256 separate
              strings of random hexadecimal garbage.
            </p>
          </div>
          <div class="border-l-2 border-zinc-800 pl-6">
            <h4
              class="text-white text-sm font-bold tracking-widest uppercase mb-1 jetbrains-mono-50"
            >
              Quantum Resistance
            </h4>
            <p class="text-xs text-zinc-400 jetbrains-mono-400">
              Built using lattice-based cryptographic primitives designed to
              withstand future decryption attempts by Shor's algorithm and
              quantum-computing clusters.
            </p>
          </div>
        </div>
      </div>

      <div class="relative flex justify-center items-center">
        <div
          class="w-64 h-64 border-2 border-dashed border-zinc-800 rounded-full animate-[spin_20s_linear_infinite] flex items-center justify-center"
        >
          <div
            class="w-48 h-48 border-2 border-emerald-500/20 rounded-full animate-[spin_10s_linear_infinite_reverse] flex items-center justify-center"
          >
            <div
              class="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center"
            >
              <Lock size={40} class="text-emerald-500" />
            </div>
          </div>
        </div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div
            class="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] text-emerald-500 font-bold bg-black px-2"
          >
            AUTH_LOCKED
          </div>
          <div
            class="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] text-zinc-700 font-bold bg-black px-2"
          >
            BRUTE_FORCE_FAIL
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
