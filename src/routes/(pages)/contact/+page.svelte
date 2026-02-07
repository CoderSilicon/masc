<script>
  import { Mail, Terminal, ExternalLink, ShieldCheck, ChevronRight } from 'lucide-svelte';

  const operatorEmail = "staticcodersilicon@gmail.com"; // Replace with your actual email
  const mailSubject = "VAULT_256_INQUIRY";
  const mailBody = "Operator_ID: [Enter_Name]%0D%0A%0D%0AMessage_Payload: ";

  // This creates the standard mailto string
  const mailtoLink = `mailto:${operatorEmail}?subject=${mailSubject}&body=${mailBody}`;
</script>

<main class="min-h-screen bg-zinc-950 text-zinc-400 font-mono p-4 md:p-12 selection:bg-emerald-500 selection:text-black">
  
  <div class="max-w-4xl mx-auto border border-zinc-800 bg-black overflow-hidden">
    
    <div class="border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-900/20">
      <div class="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest">
        <Terminal size={14} class="text-emerald-500" />
        COMMUNICATION_UPLINK
      </div>
      <div class="flex gap-1.5">
        <div class="w-1.5 h-1.5 bg-emerald-500"></div>
        <div class="w-1.5 h-1.5 bg-zinc-800"></div>
      </div>
    </div>

    <div class="p-8 md:p-16 flex flex-col items-center text-center space-y-8">
      
      <div class="space-y-4">
        <h1 class="text-3xl md:text-5xl font-black text-white italic tracking-tighter">
          SECURE_CONTACT
        </h1>
        <p class="text-[10px] text-zinc-600 uppercase tracking-[0.4em] max-w-sm mx-auto">
          Direct encrypted channel via system default mail client.
        </p>
      </div>

      <a 
        href={mailtoLink}
        class="w-full max-w-md group border border-emerald-500/30 bg-emerald-500/5 p-6 hover:bg-emerald-500 hover:text-black transition-all duration-300 relative"
      >
        <div class="flex flex-col items-center gap-2">
          <Mail size={24} class="mb-2" />
          <span class="text-sm font-black uppercase tracking-[0.3em]">Establish_Connection</span>
          <span class="text-[9px] opacity-60 uppercase font-bold tracking-widest">Target: {operatorEmail}</span>
        </div>

        <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-500 group-hover:border-black"></div>
        <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-emerald-500 group-hover:border-black"></div>
      </a>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pt-8 border-t border-zinc-900">
        <div class="flex items-center gap-3 text-[9px] text-zinc-700 uppercase font-bold text-left">
          <ShieldCheck size={12} class="text-emerald-500" />
          <span>PGP_ENCRYPTION_SUPPORTED</span>
        </div>
        <div class="flex items-center gap-3 text-[9px] text-zinc-700 uppercase font-bold md:justify-end">
          <ChevronRight size={12} class="text-emerald-500" />
          <span>AVERAGE_RESPONSE: 24HR</span>
        </div>
      </div>

    </div>

    <div class="bg-zinc-900/10 border-t border-zinc-900 px-6 py-3 flex justify-between items-center text-[8px] text-zinc-800 tracking-widest uppercase">
      <span>REF_NUM: {Math.random().toString(16).slice(2, 10)}</span>
      <div class="flex items-center gap-2">
        <ExternalLink size={8} />
        System_Direct_Exit
      </div>
    </div>

  </div>
</main>