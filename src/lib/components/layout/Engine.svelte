<script lang="ts">
  import { onMount } from "svelte";
  import { Shield, Cpu, Activity, ChevronRight, Lock } from "lucide-svelte";

  let inputVal = "my_secret_vault_password";

  let logs = [
    { type: "sys", msg: "INITIALIZING VAULT_256 KERNEL..." },
    { type: "sys", msg: "ESTABLISHING ZERO-KNOWLEDGE HANDSHAKE..." },
    { type: "success", msg: "HANDSHAKE VERIFIED. AES-GCM ENGINE READY." },
  ];

  $: encryptedString = btoa(inputVal)
    .split("")
    .map((char) =>
      Math.random() > 0.5 ? char.charCodeAt(0).toString(16) : char,
    )
    .join("")
    .substring(0, 32);

  function addLog(msg: string, type = "sys") {
    logs = [
      ...logs,
      { type, msg: `[${new Date().toLocaleTimeString()}] ${msg}` },
    ];
    if (logs.length > 8) logs.shift();
  }

  onMount(() => {
    const interval = setInterval(() => {
      const statuses = [
        "PINGING NODE_0x4F...",
        "ROTATING CIPHER_KEYS...",
        "SHARD_INTEGRITY: 100%",
        "DATA_STREAM_ACTIVE",
      ];
      addLog(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 3000);
    return () => clearInterval(interval);
  });
</script>

<main class="min-h-screen bg-black text-zinc-400 font-mono p-4 md:p-16">
  <header
    class="max-w-6xl mx-auto mb-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-end"
  >
    <div>
      <div
        class="flex items-center gap-2 text-emerald-500 text-[10px] font-black tracking-[0.5em] mb-4 uppercase"
      >
        <span
          class="w-2 h-2 bg-emerald-500 rounded-full animate-ping jetbrains-mono-400"
        ></span>
        Live_Engine_Status: Nominal
      </div>
      <h1
        class="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic leading-none jetbrains-mono-600"
      >
        Encryption <span class="text-emerald-500">Engine.</span>
      </h1>
    </div>
    <div class="border-l border-zinc-800 pl-6 hidden md:block">
      <p
        class="text-md text-zinc-100 leading-relaxed uppercase jetbrains-mono-400"
      >
        The Vault 256 core utilizes a sharded AES-GCM architecture. Data is
        processed through a non-custodial pipeline where the server never sees
        the raw key—only the resulting entropy strings.
      </p>
    </div>
  </header>

  <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4">
    <section
      class="lg:col-span-1 border border-zinc-800 bg-zinc-950/50 p-6 space-y-8"
    >
      <div>
        <h2
          class="text-white text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2"
        >
          <Cpu size={14} class="text-emerald-500" /> System_Specs
        </h2>
        <div class="space-y-3 jetbrains-mono-400">
          <div
            class="flex justify-between text-[10px] border-b border-zinc-900 pb-2"
          >
            <span>ALGORITHM</span>
            <span class="text-white">AES-256-GCM</span>
          </div>
          <div
            class="flex justify-between text-[10px] border-b border-zinc-900 pb-2"
          >
            <span>ENTROPY</span>
            <span class="text-white">2^256 BITS</span>
          </div>
          <div class="flex justify-between text-[10px]">
            <span>LATENCY</span>
            <span class="text-emerald-500">&lt; 14MS</span>
          </div>
        </div>
      </div>

      <div class="pt-8 border-t border-zinc-900">
        <h2
          class="text-white text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2"
        >
          <Activity size={14} class="text-emerald-500" /> Shard_Load
        </h2>
        <div class="flex gap-1 h-8 items-end">
          {#each Array(12) as _, i}
            <div
              class="flex-1 bg-emerald-500/20 hover:bg-emerald-500 transition-colors"
              style="height: {Math.random() * 100}%"
            ></div>
          {/each}
        </div>
      </div>
    </section>

    <section
      class="lg:col-span-3 border-2 border-emerald-500/20 bg-black relative"
    >
      <div
        class="bg-zinc-900/50 px-4 py-3 flex justify-between items-center border-b border-zinc-900"
      >
        <div class="flex gap-2">
          <div class="w-2 h-2 bg-emerald-500"></div>
          <div class="w-2 h-2 bg-zinc-800"></div>
          <div class="w-2 h-2 bg-zinc-800"></div>
        </div>
        <span class="text-[9px] text-zinc-500 tracking-[0.3em]"
          >V256_CRYPTOGRAPHIC_RECON</span
        >
      </div>

      <div class="p-8 space-y-12">
        <div>
          <h3
            class="text-emerald-500 text-[10px] font-bold mb-4 flex items-center gap-2 jetbrains-mono-500"
          >
            <ChevronRight size={12} /> DATA_STAGING_AREA
          </h3>
          <div
            class="bg-zinc-900/30 border border-zinc-800 p-4 focus-within:border-emerald-500/50 transition-all jetbrains-mono-400"
          >
            <input
              bind:value={inputVal}
              class="bg-transparent border-none outline-none text-white w-full font-mono text-xl"
              placeholder="Enter sensitive data..."
            />
          </div>
        </div>

        <div>
          <h3
            class="text-zinc-500 text-[10px] font-bold mb-4 jetbrains-mono-500"
          >
            OUTPUT: AES_256_STRING_SHARDS
          </h3>
          <div
            class="bg-black border border-emerald-500/10 p-6 min-h-30 break-all text-emerald-400 font-mono text-lg leading-tight relative"
          >
            <div
              class="absolute inset-0 jetbrains-mono-400 pointer-events-none opacity-40"
            ></div>
            0x{encryptedString}
          </div>
        </div>

        <div
          class="bg-zinc-950 p-4 border border-zinc-900 h-32 overflow-hidden text-[10px]"
        >
          {#each logs as log}
            <div class="flex gap-4 mb-1">
              <span class="text-zinc-800"
                >{new Date().toLocaleTimeString()}</span
              >
              <span
                class={log.type === "success"
                  ? "text-emerald-500"
                  : "text-zinc-500"}>{log.msg}</span
              >
            </div>
          {/each}
          <div class="text-emerald-500 animate-pulse mt-1">_ EXEC_CMD:</div>
        </div>
      </div>
    </section>
  </div>

  <footer
    class="max-w-6xl mx-auto mt-4 grid grid-cols-1 md:grid-cols-4 border border-zinc-900 bg-zinc-950/20 jetbrains-mono-400"
  >
    <div class="p-6 border-r border-zinc-900 flex items-center gap-4">
      <Lock size={20} class="text-emerald-500" />
      <div>
        <p class="text-white text-[10px] font-bold">NON-CUSTODIAL</p>
        <p class="text-zinc-600 text-[9px]">We never hold your keys.</p>
      </div>
    </div>
    <div class="p-6 border-r border-zinc-900 flex items-center gap-4">
      <Shield size={20} class="text-emerald-500" />
      <div>
        <p class="text-white text-[10px] font-bold">FIPS 140-2 READY</p>
        <p class="text-zinc-600 text-[9px]">Banking grade security.</p>
      </div>
    </div>
    <div class="md:col-span-2 p-6 flex items-center justify-end gap-4">
      <span class="text-[10px] text-zinc-700"
        >SHA-256 SIGNATURE: 8f92...a3e1</span
      >
      <button
        class="bg-emerald-500 text-black px-4 py-1 text-[10px] font-black uppercase hover:bg-white transition-colors"
        >Audit Node</button
      >
    </div>
  </footer>
</main>
