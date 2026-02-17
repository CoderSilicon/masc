<script>
  import logo from '$lib/assets/256.svg'
  import { onMount } from 'svelte';
  import { session } from '../../session';
  import { goto } from '$app/navigation';

  //  if (!$session.loading && !$session.loggedIn) {
  //   goto('/login');
  // }

  // State
  let activeTab = "vault";
  let searchQuery = "";
  let viewMode = "grid";
  let currentTime = "";

  // Update time every second for terminal effect
  onMount(() => {
    const updateTime = () => {
      const now = new Date();
      currentTime = `[${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}::${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  });

  // Mock Data
  const folders = [
    {
      name: "Project_Alpha",
      size: "2.4 GB",
      items: 12,
      encryption: "AES-GCM-256",
      status: "active",
      hash: "0x7A4F2B"
    },
    {
      name: "Financial_Records",
      size: "150 MB",
      items: 8,
      encryption: "Zero-Knowledge",
      status: "active",
      hash: "0x9E1C5D"
    },
    { 
      name: "System_Core", 
      size: "45 GB", 
      items: 3, 
      encryption: "Immutable",
      status: "locked",
      hash: "0x3B8A9F"
    },
    { 
      name: "Offshore_Log", 
      size: "1.2 GB", 
      items: 24, 
      encryption: "AES-256",
      status: "active",
      hash: "0x6D2E4C"
    },
  ];

  const recentFiles = [
    {
      name: "server_manifest.json",
      type: "JSON",
      size: "4 KB",
      date: "2026-01-25",
      time: "14:32:07",
      host: "cloud",
      hash: "a7f4e2b"
    },
    {
      name: "network_topology.pdf",
      type: "PDF",
      size: "2.8 MB",
      date: "2026-01-24",
      time: "09:18:42",
     host: "local",
      hash: "9c1d5e8"
    },
    {
      name: "access_key_shard_01.dat",
      type: "DAT",
      size: "256 B",
      date: "2026-01-22",
      time: "23:45:19",
      host: "cloud",
      hash: "3b8f9a2"
    },
    {
      name: "blueprint_render_v2.png",
      type: "IMG",
      size: "14 MB",
      date: "2026-01-20",
      time: "16:07:33",
      host: "local",
      hash: "6d2c4e7"
    },
    {
      name: "encrypted_payload.zip",
      type: "ZIP",
      size: "400 MB",
      date: "2026-01-18",
      time: "11:29:51",
      host: "local",
      hash: "e5a3f1c"
    },
  ];
</script>

<div class="h-screen bg-zinc-950 text-white flex overflow-hidden antialiased relative">
  <!-- Grid Background -->
  <div class="absolute inset-0 pointer-events-none opacity-[0.03]">
    <div class="absolute inset-0" style="
      background-image: 
        linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px);
      background-size: 50px 50px;
    "></div>
  </div>

  <!-- Scanline Effect -->
  <div class="scanline"></div>

  <!-- Noise Overlay -->
  <div class="noise"></div>

  <!-- Minimal Sidebar -->
  <aside class="w-72 flex flex-col bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-800/50 relative z-10">
    <!-- Logo -->
    <div class="h-16 flex items-center gap-3 px-6 border-b border-zinc-800/30">
      <img src={logo} alt="" height="32" width="32" class="opacity-90">
      <div class="flex flex-col">
        <span class="text-lg font-semibold tracking-tight text-white font-mono">Vault256</span>
        <span class="text-[10px] text-emerald-500/60 font-mono">v2.0.1-secure</span>
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex-1 px-4 py-6 overflow-y-auto">
      <nav class="space-y-1 mb-8">
        {#each [
          { label: "My Vault", icon: "◆", code: "0x01" },
          { label: "Shared", icon: "◇", code: "0x02" },
          { label: "Recent", icon: "○", code: "0x03" },
          { label: "Trash", icon: "△", code: "0x04" }
        ] as tab}
          <button
            on:click={() => (activeTab = tab.label.toLowerCase())}
            class="w-full text-left px-4 py-2.5 text-sm transition-all duration-200 flex items-center justify-between group
            {activeTab === tab.label.toLowerCase()
              ? 'bg-emerald-500 text-black shadow-sm shadow-emerald-500/20'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'}"
          >
            <div class="flex items-center gap-3">
              <span class="text-xs opacity-60">{tab.icon}</span>
              <span class="font-medium font-mono">{tab.label}</span>
            </div>
            <span class="text-[9px] opacity-40 font-mono">{tab.code}</span>
          </button>
        {/each}
      </nav>

      <!-- System Status -->
      <div class="mb-6 px-4">
        <div class="text-[10px] text-zinc-600 mb-2 font-mono uppercase tracking-wider">System Status</div>
        <div class="space-y-1.5">
          <div class="flex items-center gap-2 text-xs">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="text-zinc-500 font-mono">Encryption: Active</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="text-zinc-500 font-mono">Network: Secure</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <div class="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
            <span class="text-zinc-500 font-mono">Sync: Pending</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="space-y-2">
        <div class="text-[10px] font-semibold text-zinc-600 px-4 mb-3 font-mono uppercase tracking-wider">Quick Actions</div>
        <button class="w-full px-4 py-2.5 text-sm text-left text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-all flex items-center gap-3 font-mono">
          <span class="text-xs opacity-60">+</span>
          <span class="font-medium">New Folder</span>
        </button>
        <button class="w-full px-4 py-2.5 text-sm text-left text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-all flex items-center gap-3 font-mono">
          <span class="text-xs opacity-60">↑</span>
          <span class="font-medium">Upload Files</span>
        </button>
      </div>
    </div>

    <!-- Storage Info -->
    <div class="p-6 border-t border-zinc-800/50">
      <div class="flex justify-between text-xs text-zinc-400 mb-3">
        <span class="font-medium font-mono">Storage</span>
        <span class="font-semibold text-emerald-500 font-mono">150GB/200GB</span>
      </div>
      <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
        <div class="h-full bg-emerald-500 w-3/4 rounded-full transition-all duration-500"></div>
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
      </div>
      <div class="text-[10px] text-zinc-600 mt-2 font-mono">75% allocated • 0xA7F4E2B9</div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 flex flex-col overflow-hidden bg-zinc-950 relative z-10">
    <!-- Header -->
    <header class="h-16 border-b border-zinc-800/50 flex items-center justify-between px-8 bg-zinc-950/80 backdrop-blur-xl">
      <!-- Search -->
      <div class="flex-1 max-w-xl">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            placeholder="Search vault... [CTRL+K]"
            bind:value={searchQuery}
            class="w-full bg-zinc-900/50 border border-zinc-800 py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
          />
        </div>
      </div>

      <!-- View Controls & User -->
      <div class="flex items-center gap-6">
        <!-- Terminal Time -->
        <div class="text-xs text-emerald-500/70 font-mono">{currentTime}</div>

        <!-- View Toggle -->
        <div class="flex items-center gap-1 bg-zinc-900 p-1">
          <button 
            on:click={() => viewMode = 'grid'}
            class="p-1.5 transition-all {viewMode === 'grid' ? 'bg-zinc-800 text-emerald-500' : 'text-zinc-600 hover:text-zinc-400'}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
          </button>
          <button 
            on:click={() => viewMode = 'list'}
            class="p-1.5 transition-all {viewMode === 'list' ? 'bg-zinc-800 text-emerald-500' : 'text-zinc-600 hover:text-zinc-400'}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>

        <!-- User Avatar -->
        <div class="flex items-center gap-3 px-3 py-1.5 bg-zinc-900 border border-zinc-800">
          <div class="w-7 h-7 bg-emerald-500 flex items-center justify-center text-black text-[10px] font-bold font-mono">
            ADM
          </div>
          <div class="text-xs text-zinc-500 font-mono">root@vault</div>
        </div>
      </div>
    </header>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto px-8 py-8">
      <!-- Recent Files Section -->
      <div>
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl text-white tracking-tight jetbrains-mono-600">Access Log</h2>
            <p class="text-sm text-zinc-600 mt-1 jetbrains-mono-400">5 file operations • chronological order</p>
          </div>
        </div>

        <div class="bg-zinc-900/30 border border-zinc-800 overflow-hidden">
          <!-- Table Header -->
          <div class="grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-800/30 border-b border-zinc-800 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider jetbrains-mono-400">
            <div class="col-span-4">Filename</div>
            <div class="col-span-2">Host</div>
            <div class="col-span-3">Timestamp</div>
            <div class="col-span-2 text-right">Size</div>
            <div class="col-span-1 text-right">Hash</div>
          </div>

          <!-- Table Rows -->
          {#each recentFiles as file}
            <div
              class="grid grid-cols-12 gap-4 px-6 py-3.5 text-sm hover:bg-zinc-800/30 transition-colors cursor-pointer items-center border-b border-zinc-800/30 last:border-b-0 group"
            >
              <div class="col-span-4 flex items-center gap-3">
                <div class="w-7 h-7 bg-zinc-800/50 flex items-center justify-center shrink-0 border border-zinc-700 group-hover:border-emerald-500/50 transition-colors">
                  <span class="text-[9px] font-bold text-zinc-600 group-hover:text-emerald-500 transition-colors font-mono">{file.type}</span>
                </div>
                <span class="truncate text-zinc-400 font-medium font-mono text-xs group-hover:text-white transition-colors">{file.name}</span>
              </div>
              <div class="col-span-2  font-mono text-xs text-emerald-600">{file.host}</div>
              <div class="col-span-3 text-zinc-600 font-mono text-[11px]">
                [{file.date}::{file.time}]
              </div>
              <div class="col-span-2 text-right text-zinc-600 font-mono text-xs">
                {file.size}
              </div>
              <div class="col-span-1 text-right text-emerald-500/50 font-mono text-[9px]">
                {file.hash}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  :global(body) {
    font-family: 'JetBrains Mono', monospace;
  }

  /* Scanline Effect */
  .scanline {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      to bottom,
      transparent 50%,
      rgba(0, 0, 0, 0.02) 51%
    );
    background-size: 100% 4px;
    z-index: 1;
    animation: scanline 8s linear infinite;
  }

  @keyframes scanline {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 0 100vh;
    }
  }

  /* Noise Overlay */
  .noise {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.03;
    z-index: 1;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }

  /* Shimmer animation */
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
</style>