<script>
  import { ShieldCheck, Lock, Activity, ChevronRight } from "lucide-svelte";
  import logo from "$lib/assets/256.svg";
</script>

<main
  class="min-h-screen bg-zinc-950 text-zinc-400 font-mono flex items-center selection:bg-emerald-500 selection:text-black"
>
  <div
    class="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-0 border border-zinc-900 bg-black shadow-2xl overflow-hidden"
  >
    <section
      class="p-8 md:p-16 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-zinc-900"
    >
      <div>
        <h2
          class="text-emerald-500 font-mono text-sm tracking-[0.3em] uppercase mb-2 jetbrains-mono-300"
        >
          // 256_MOTIVE
        </h2>
      </div>

      <div class="space-y-8 max-w-lg">
        <p
          class="text-sm leading-relaxed text-zinc-300 uppercase italic font-bold border-l-4 border-emerald-500 pl-6 jetbrains-mono-400"
        >
          Vault256 was engineered for the era of mass surveillance. We don't
          store files; we store cryptographic ghosts.
        </p>

        <p
          class="text-xs leading-relaxed text-zinc-500 uppercase tracking-tighter jetbrains-mono-300"
        >
          We realized that traditional "Cloud" storages is just someone else's
          computer with a master key. <br />
          You own your data, but they hold the keys. <br />
          You promise privacy. But give piracy<br />
          For you it is data, for them, it's product.<br />
          And Salesmen will always see their product before selling it. or not?<br
          />
        </p>
        <p
          class="text-xs leading-relaxed text-zinc-300 uppercase tracking-tighter jetbrains-mono-300"
        >
          That's why we made Vault256.<br />
          A storage system where only YOU can access YOUR data.<br />
          Vault256 shreds your data into 256-bit AES ( Advanced Encryption Standard
          - used by the U.S. government ) strings locally. By the time it reaches
          the lattice, it is mathematically impossible to read, scan, or exploit.
        </p>

        <div class="grid grid-cols-2 gap-4 pt-8">
          <div class="border border-zinc-800 p-4">
            <p
              class="text-[10px] text-zinc-600 mb-2 underline uppercase jetbrains-mono-500"
            >
              Protocol
            </p>
            <p
              class="text-white text-xs font-bold uppercase jetbrains-mono-400"
            >
              Zero-Knowledge
            </p>
          </div>
          <div class="border border-zinc-800 p-4">
            <p
              class="text-[10px] text-zinc-600 mb-2 underline uppercase jetbrains-mono-500"
            >
              Integrity
            </p>
            <p
              class="text-white text-xs font-bold uppercase jetbrains-mono-400"
            >
              Immutable
            </p>
          </div>
        </div>
      </div>
    </section>

    <section
      class="relative bg-zinc-950 p-16 flex items-center justify-center overflow-hidden"
    >
      <div
        class="absolute inset-0 opacity-10 pointer-events-none"
        style="background-image: radial-gradient(#10b981 1px, transparent 1px); background-size: 30px 30px;"
      ></div>

      <div
        class="relative w-full max-w-md aspect-square flex items-center justify-center"
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="w-full h-full text-emerald-500 drop-shadow-[0_0_30px_rgba(16,185,129,0.2)]"
        >
          <path
            d="M5 25 L5 5 L25 5 M75 5 L95 5 L95 25 M95 75 L95 95 L75 95 M25 95 L5 95 L5 75"
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
        <img
          src={logo}
          alt="logo"
          class="absolute w-64 h-64 animate-pulse-slow opacity-100"
        />

        <div
          class="absolute top-4 left-4 flex items-center gap-2 text-[8px] text-zinc-700 font-bold uppercase"
        >
          <Activity size={10} /> Sector_Locked
        </div>
        <div
          class="absolute bottom-4 right-4 flex items-center gap-2 text-[8px] text-zinc-700 font-bold uppercase"
        >
          <ShieldCheck size={10} /> Verified_Auth
        </div>
      </div>
    </section>
  </div>
</main>
