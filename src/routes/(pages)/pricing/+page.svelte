<script>
  import { Shield, Zap, Lock, Unlock, ChevronRight, Activity } from 'lucide-svelte';

  const currentStatus = "BETA_PHASE_01";
</script>

<main class="min-h-screen bg-zinc-950 text-zinc-400 font-mono p-4 md:p-12 selection:bg-emerald-500 selection:text-black">
  
  <header class="max-w-6xl mx-auto mb-16">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-3 h-3 bg-emerald-500 animate-pulse"></div>
      <span class="text-emerald-500 text-[10px] font-black tracking-[0.5em] uppercase">Status: Open_Access</span>
    </div>
    <h1 class="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter">
      Clearance <span class="text-emerald-500">& Plans.</span>
    </h1>
    <p class="mt-6 text-xs text-zinc-600 max-w-xl uppercase leading-relaxed">
      Vault256 is currently in open-access mode. During this phase, all encryption and storage protocols are available at zero cost to establish network stress metrics.
    </p>
  </header>

  <section class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
    
    <div class="bg-black border-2 border-emerald-500 p-8 flex flex-col relative overflow-hidden group">
      <div class="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-black px-3 py-1 uppercase tracking-tighter">
        Active_Now
      </div>

      <div class="mb-12">
        <div class="text-emerald-500 mb-2"><Unlock size={20} /></div>
        <h2 class="text-white text-2xl font-black italic uppercase">Early_Adopter</h2>
        <p class="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">Protocol: FREE_ACCESS</p>
      </div>

      <div class="text-4xl font-black text-white mb-8">$0<span class="text-xs text-zinc-700 font-bold ml-2 italic">/ INFINITE</span></div>

      <ul class="space-y-4 mb-16 grow">
        <li class="flex items-center gap-3 text-[10px] text-zinc-300 uppercase">
          <Zap size={12} class="text-emerald-500" /> Full Lattice Sharding
        </li>
        <li class="flex items-center gap-3 text-[10px] text-zinc-300 uppercase">
          <Zap size={12} class="text-emerald-500" /> Unlimited AES-256 Strings
        </li>
        <li class="flex items-center gap-3 text-[10px] text-zinc-300 uppercase">
          <Zap size={12} class="text-emerald-500" /> Zero-Knowledge Auditing
        </li>
      </ul>

      <button class="w-full bg-emerald-500 text-black py-4 font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all">
        Enter_The_Vault
      </button>
    </div>

    <div class="bg-zinc-950 border border-zinc-900 p-8 flex flex-col opacity-40 grayscale pointer-events-none relative group">
      <div class="absolute inset-0 flex items-center justify-center z-10">
        <div class="bg-zinc-900 border border-zinc-800 px-4 py-2 text-[10px] font-black text-zinc-500 tracking-[0.3em] uppercase rotate-12">
          Coming_Soon
        </div>
      </div>
      
      <div class="mb-12">
        <div class="text-zinc-700 mb-2"><Lock size={20} /></div>
        <h2 class="text-zinc-500 text-2xl font-black italic uppercase">Sovereign</h2>
        <p class="text-[10px] text-zinc-800 mt-1 uppercase tracking-widest">Protocol: usage_based</p>
      </div>

      <div class="text-4xl font-black text-zinc-800 mb-8">$??</div>

      <ul class="space-y-4 mb-16 grow">
        <li class="flex items-center gap-3 text-[10px] text-zinc-800 uppercase italic">Higher-Volume Sharding</li>
        <li class="flex items-center gap-3 text-[10px] text-zinc-800 uppercase italic">Priority Node Sync</li>
      </ul>
    </div>

    <div class="bg-zinc-950 border border-zinc-900 p-8 flex flex-col opacity-40 grayscale pointer-events-none relative group">
       <div class="absolute inset-0 flex items-center justify-center z-10">
        <div class="bg-zinc-900 border border-zinc-800 px-4 py-2 text-[10px] font-black text-zinc-500 tracking-[0.3em] uppercase -rotate-12">
          [REDACTED]
        </div>
      </div>

      <div class="mb-12 text-zinc-800">
        <div class="mb-2"><Shield size={20} /></div>
        <h2 class="text-2xl font-black italic uppercase ">Architect</h2>
      </div>
       <div class="text-4xl font-black text-zinc-800 mb-8">$---</div>
    </div>

  </section>

  <footer class="max-w-6xl mx-auto mt-16 p-8 border border-zinc-900 bg-black/50">
    <div class="flex flex-col md:flex-row justify-between items-center gap-6">
      <div class="flex items-center gap-4">
        <Activity size={18} class="text-emerald-500" />
        <div>
          <p class="text-white text-xs font-bold uppercase tracking-widest">Scalability Protocol</p>
          <p class="text-[10px] text-zinc-600 uppercase italic">Future pricing will be calculated based on lattice load and total sharded volume.</p>
        </div>
      </div>
      <div class="text-[9px] text-zinc-800 font-bold uppercase tracking-[0.2em] border-l border-zinc-900 pl-6 hidden md:block">
        Est_Launch_v1.0: Q4_2026
      </div>
    </div>
  </footer>

</main>