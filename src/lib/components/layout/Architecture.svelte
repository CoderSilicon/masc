<script>
  let steps = [
    {
      id: "01",
      title: "Ingestion",
      desc: "Raw data is accepted via a zero-knowledge tunnel.",
      status: "completed",
    },
    {
      id: "02",
      title: "Fragmentation",
      desc: "File is split into 256 cryptographic shards.",
      status: "active",
    },
    {
      id: "03",
      title: "AES-256 GCM",
      desc: "Each shard is wrapped in military-grade cipher.",
      status: "pending",
    },
    {
      id: "04",
      title: "Stringification",
      desc: "Binary data converted to immutable hash strings.",
      status: "pending",
    },
  ];
</script>

<main
  class="min-h-screen bg-zinc-950 text-zinc-400 font-sans p-8 md:p-24 overflow-x-hidden"
>
  <section class="max-w-6xl mx-auto mb-32">
    <div class="mb-12">
      <h2
        class="text-emerald-500 font-mono text-sm tracking-[0.3em] uppercase mb-2 jetbrains-mono-300"
      >
        // SYSTEM_FLOW
      </h2>
      <h1
        class="text-4xl md:text-6xl font-black text-white tracking-tighter jetbrains-mono-600"
      >
        THE SHARDING PROCESS.
      </h1>
    </div>

    <div
      class="flex flex-col md:flex-row items-center justify-between gap-6 relative"
    >
      <div
        class="hidden md:block absolute top-1/2 left-0 w-full h-px bg-zinc-800 -z-10"
      ></div>

      {#each steps as step, i}
        <div class="flex items-center flex-1 w-full">
          <div
            class="bg-zinc-900/50 border border-zinc-800 p-6 relative group hover:border-emerald-500/50 transition-all duration-500 jetbrains-mono-400
        w-full md:w-64 h-48 flex flex-col justify-center /* Fixed height & width */
        {step.status === 'completed' ? 'opacity-70' : ''} 
        {step.status === 'active'
              ? 'border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
              : ''}"
          >
            <span
              class="absolute -top-3 left-6 bg-zinc-950 px-2 font-mono text-xs
          {step.status === 'active' ? 'text-emerald-500' : 'text-zinc-600'}"
            >
              STEP_{step.id}
            </span>

            <h3
              class="text-white font-bold mb-2 uppercase tracking-tight jetbrains-mono-500"
            >
              {step.title}
            </h3>

            <p class="text-xs leading-relaxed jetbrains-mono-400 text-zinc-400">
              {step.desc}
            </p>

            {#if step.status === "active"}
              <div class="mt-4 h-1 w-full bg-zinc-800 overflow-hidden">
                <div
                  class="h-full bg-emerald-500 animate-[progress_2s_infinite]"
                ></div>
              </div>
            {/if}
          </div>

          {#if i < steps.length - 1}
            <div
              class="hidden md:block grow min-w-6 h-2 bg-zinc-800 relative pipeline-flow rounded-full mx-2"
            ></div>
            <div class="md:hidden text-zinc-700 text-xl">↓</div>
          {/if}
        </div>
      {/each}
    </div>
  </section>

  <section class="max-w-5xl mx-auto">
    <div class="text-center mb-16">
      <h2
        class="text-white text-3xl md:text-4xl font-bold mb-4 jetbrains-mono-400"
      >
        Why traditional clouds fail.
      </h2>
      <p class="text-zinc-500 jetbrains-mono-300">
        Traditional storage silos are honey pots for intruders.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
      <div class="p-8 border border-red-900/30 bg-red-950/10 rounded-xl">
        <h3
          class="text-zinc-500 font-mono uppercase tracking-widest text-sm mb-6 border-b border-red-900/30 pb-4 flex items-center"
        >
          Generic Cloud
        </h3>
        <ul class="space-y-6">
          {#each ["Centralized Silo", "Provider Owned Keys", "Readable by AI/Admins", "Single Point of Failure"] as feature}
            <li class="flex items-center gap-4 text-zinc-400 group">
              <span
                class="text-red-900/50 group-hover:text-red-500 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><circle cx="12" cy="12" r="10"></circle><line
                    x1="15"
                    y1="9"
                    x2="9"
                    y2="15"
                  ></line><line x1="9" y1="9" x2="15" y2="15"></line></svg
                >
              </span>
              <span class="font-mono text-sm">{feature}</span>
            </li>
          {/each}
        </ul>
      </div>

      <div
        class="relative p-8 border-2 border-emerald-950/20 rounded-xl transform md:scale-110 shadow-[0_0_50px_rgba(16,185,129,0.1)]"
      >
        <h3
          class="text-emerald-400 font-mono uppercase tracking-widest text-sm mb-6 border-b border-emerald-500/30 pb-4 flex justify-between items-center"
        >
          Vault 256
          <span
            class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"
          ></span>
        </h3>

        <ul class="space-y-6">
          {#each ["Cryptographic Sharding", "Zero-Knowledge (Client Only)", "Encrypted String Fragments", "Quantum-Resistant Entropy"] as feature}
            <li class="flex items-center gap-4 text-white group">
              <span
                class="text-emerald-500 group-hover:scale-110 transition-transform duration-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline
                    points="22 4 12 14.01 9 11.01"
                  ></polyline></svg
                >
              </span>
              <span class="font-mono text-sm tracking-wide">{feature}</span>
            </li>
          {/each}
        </ul>

        <div
          class="absolute top-0 right-0 -mt-2 -mr-2 w-4 h-4 border-t-2 border-r-2 border-emerald-500"
        ></div>
        <div
          class="absolute bottom-0 left-0 -mb-2 -ml-2 w-4 h-4 border-b-2 border-l-2 border-emerald-500"
        ></div>
      </div>
    </div>
  </section>
</main>

<style>
  .pipeline-flow {
    position: relative;
    overflow: hidden;
  }
  .pipeline-flow::after {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, #10b981, transparent);
    animation: flow 2s infinite;
  }

  @keyframes flow {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }
</style>
