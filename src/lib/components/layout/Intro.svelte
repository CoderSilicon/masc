<main
  class="relative bg-zinc-950 h-screen w-full flex items-center justify-center overflow-hidden antialiased"
>
  <div
    class="absolute inset-0 z-0 opacity-10"
    style="background-image: radial-gradient(#34d399 0.5px, transparent 0.5px); background-size: 24px 24px;"
  ></div>

  <div
    class="text-center flex flex-col justify-center items-center z-50 relative px-6"
  >
    <h1
      class="text-5xl md:text-7xl font-black text-white tracking-tight mb-4 jetbrains-mono-600"
    >
      Hide <span class="">Anything.</span>
    </h1>

    <div class="relative group cursor-default">
      <div
        class="absolute -inset-1 bg-emerald-500/20 blur opacity-25 group-hover:opacity-50 transition duration-1000"
      ></div>
      <p
        class="relative py-2 px-6 border border-emerald-500/20 bg-black/40 backdrop-blur-sm jetbrains-mono-400 text-emerald-400 md:text-xl tracking-tighter"
      >
        Inside any file, in plain sight.
      </p>
    </div>

    <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
      <div class="space-y-2 border-t border-zinc-800 pt-4">
        <p
          class="text-zinc-500 font-mono text-[10px] uppercase tracking-widest"
        >
          Method A
        </p>
        <p class="text-white font-mono text-sm">Hidden in the pixels</p>
      </div>
      <div class="space-y-2 border-t border-emerald-500/50 pt-4">
        <p
          class="text-emerald-500 font-mono text-[10px] uppercase tracking-widest"
        >
          Method B
        </p>
        <p
          class="text-white font-mono text-sm underline decoration-emerald-500/50 underline-offset-4"
        >
          A file inside a file
        </p>
      </div>
      <div class="space-y-2 border-t border-zinc-800 pt-4">
        <p
          class="text-zinc-500 font-mono text-[10px] uppercase tracking-widest"
        >
          Processing
        </p>
        <p class="text-white font-mono text-sm">On your device</p>
      </div>
    </div>

    <a
      href="/steg"
      class="mt-12 group relative px-10 py-4 bg-emerald-500 text-black font-bold uppercase tracking-widest overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-emerald-500 hover:ring-offset-2 hover:ring-offset-zinc-950"
    >
      <span class="relative z-10">Open Workbench</span>
      <div
        class="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300"
      ></div>
    </a>

    <p
      class="mt-6 text-[10px] text-zinc-700 font-mono tracking-wider uppercase max-w-md leading-relaxed"
    >
      Keep the file exactly as downloaded. Re-saving it erases the message.
    </p>

    <div
      class="absolute -top-10 -left-10 w-20 h-20 border-t-2 border-l-2 border-emerald-500/20"
    ></div>
    <div
      class="absolute -bottom-10 -right-10 w-20 h-20 border-b-2 border-r-2 border-emerald-500/20"
    ></div>
  </div>

  <div
    class="absolute left-4 top-0 bottom-0 w-px bg-linear-to-b from-transparent via-emerald-500/20 to-transparent hidden lg:block"
  ></div>
  <div
    class="absolute right-4 top-0 bottom-0 w-px bg-linear-to-b from-transparent via-emerald-500/20 to-transparent hidden lg:block"
  ></div>
</main>
