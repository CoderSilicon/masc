<script>
  import { Shield, Zap, Share2, EyeOff, Lock, Cpu, Globe, Activity } from 'lucide-svelte';

  const specs = [
    { code: "P.01", title: "ZERO_ACCESS_ARCH", status: "ACTIVE", value: "99.99%", icon: Shield, desc: "Total elimination of provider-side keys. No backdoors." },
    { code: "P.02", codeColor: "text-emerald-500", title: "DATA_FRAGMENTATION", status: "SHARDING", value: "0.02MS", icon: Share2, desc: "Real-time shredding of data into 256-bit entropy shards." },
    { code: "P.03", title: "QUANTUM_ENTROPY", status: "SECURED", value: "LATTICE", icon: Zap, desc: "Post-quantum cryptographic salts for long-term immunity." },
    { code: "P.04", title: "DECENTRAL_MAINFRAME", status: "SYNCED", value: "256/256", icon: Globe, desc: "Global distribution across independent lattice nodes." },
    { code: "P.05", title: "ANOMALY_DETECTION", status: "MONITORING", value: "NULL", icon: Activity, desc: "Heuristic monitoring for unauthorized shard reconstruction." },
    { code: "P.06", title: "AES_NI_ACCEL", status: "HARDWARE", value: "OPTIMIZED", icon: Cpu, desc: "Direct hardware-level encryption with zero CPU latency." }
  ];
</script>

<main class="min-h-screen bg-zinc-950 text-zinc-500 font-mono p-4 md:p-8 flex flex-col">
  
  <header class="border border-zinc-800 p-6 mb-4 bg-black">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <div class="text-emerald-500 text-[10px] font-bold tracking-[0.4em] mb-2 uppercase">Global_System_Directives // Vault256</div>
        <h1 class="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
          Operating <span class="text-emerald-500">Parameters.</span>
        </h1>
      </div>
      <div class="text-[10px] border-l border-zinc-800 pl-4 space-y-1">
        <p>BUILD_VER: 0.9.1-ALPHA</p>
        <p>LATTICE_NODE: PRIMARY_01</p>
        <p class="text-emerald-500">ENCRYPTION: ENGAGED</p>
      </div>
    </div>
  </header>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-grow">
    {#each specs as spec}
      <div class="border border-zinc-800 bg-black p-6 flex flex-col justify-between hover:border-emerald-500/50 transition-colors group">
        <div>
          <div class="flex justify-between items-start mb-6">
            <span class="text-[10px] font-bold {spec.codeColor || 'text-zinc-700'}">{spec.code}</span>
            <svelte:component this={spec.icon} size={16} class="text-zinc-700 group-hover:text-emerald-500 transition-colors" />
          </div>
          
          <h2 class="text-white text-sm font-black tracking-widest uppercase mb-2">
            {spec.title}
          </h2>
          <p class="text-[10px] leading-relaxed text-zinc-600 uppercase mb-4">
            {spec.desc}
          </p>
        </div>

        <div class="pt-4 border-t border-zinc-900 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="text-[9px] font-bold tracking-widest">{spec.status}</span>
          </div>
          <span class="text-[11px] text-white font-black italic">{spec.value}</span>
        </div>
      </div>
    {/each}
  </div>

  <footer class="mt-4 border border-zinc-800 bg-black p-4 flex flex-col md:flex-row justify-between items-center gap-4">
    <div class="flex gap-8">
      <div class="flex flex-col">
        <span class="text-[8px] uppercase text-zinc-700">Compliance</span>
        <span class="text-[10px] text-zinc-300 font-bold">FIPS_140-3</span>
      </div>
      <div class="flex flex-col">
        <span class="text-[8px] uppercase text-zinc-700">Network_Latency</span>
        <span class="text-[10px] text-emerald-500 font-bold">&lt;--0.0.0MS</span>
      </div>
    </div>

    <div class="hidden lg:block text-[8px] text-zinc-800 uppercase tracking-[0.5em]">
      [ PROTOCOL_ESTABLISHED_SUCCESSFULLY ]
    </div>

    <div class="flex items-center gap-2">
      <span class="text-[10px] text-zinc-600 font-bold">MODE:</span>
      <span class="bg-emerald-500 text-black px-2 py-0.5 text-[9px] font-black uppercase">Vision_Verified</span>
    </div>
  </footer>

</main>