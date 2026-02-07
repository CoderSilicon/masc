<script lang="ts">
  import { onMount } from "svelte";
  import { gsap } from "gsap";
  import ScrambleTextPlugin from "gsap/ScrambleTextPlugin";
  import { ChevronRight, Cpu, Globe } from "lucide-svelte";

  gsap.registerPlugin(ScrambleTextPlugin);

  let canvas: HTMLCanvasElement;
  let container: HTMLDivElement;
  let headline: HTMLHeadingElement;

  class Particle {
    x = Math.random() * canvas.width;
    y = Math.random() * canvas.height;
    vx = (Math.random() - 0.5) * 0.5;
    vy = (Math.random() - 0.5) * 0.5;

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
  }

  onMount(() => {
    // --- 1. NEURAL LATTICE BACKGROUND ---
    const ctx = canvas.getContext("2d")!;
    let particles: any[] = [];
    const particleCount = 60;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    for (let i = 0; i < particleCount; i++) particles.push(new Particle());

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
      ctx.fillStyle = "rgba(16, 185, 129, 0.3)";

      particles.forEach((p, i) => {
        p.update();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 150) {
            ctx.lineWidth = 1 - dist / 150;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      requestAnimationFrame(animate);
    }
    animate();

    // --- 2. THE 20/20 REVEAL ---
    const tl = gsap.timeline();
    tl.fromTo(
      container,
      { opacity: 0, y: 20 },
      { duration: 0.6, opacity: 1, y: 0, ease: "power4.out" },
    ).to(
      headline,
      {
        duration: 1,
        scrambleText: {
          text: "Ready to Secure Your Data.",
          chars: "upperCase",
          speed: 0.4,
        },
      },
      "-=0.2",
    );
  });
</script>

<main
  class="relative min-h-screen bg-zinc-950 flex items-center justify-center p-6 font-mono overflow-hidden"
>
  <canvas bind:this={canvas} class="absolute inset-0 pointer-events-none"
  ></canvas>

  <div
    bind:this={container}
    class="relative z-10 w-full max-w-xl p-px bg-linear-to-b from-emerald-500/30 to-transparent "
  >
    <div
      class="bg-black/80 backdrop-blur-xl  p-8 md:p-12 border border-white/5"
    >
      <div class="flex justify-between items-center mb-16">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span
            class="text-[10px] text-emerald-500/70 tracking-widest uppercase"
            >Node_Active</span
          >
        </div>
        <div class="flex gap-4">
          <Cpu size={14} class="text-zinc-700" />
          <Globe size={14} class="text-zinc-700" />
        </div>
      </div>

      <h1
        bind:this={headline}
        class="text-3xl md:text-5xl font-light text-white mb-6 tracking-[ -0.05em] leading-tight jetbrains-mono-600"
      >
        Initializing...
      </h1>

      <p class="text-zinc-500 text-xs uppercase tracking-[0.3em] mb-12 jetbrains-mono-500">
        Finalizing environment handshake.
      </p>

      <button
        class="group relative w-full overflow-hidden bg-white text-black h-16 font-bold text-[10px] uppercase tracking-[0.5em] transition-all duration-300 hover:tracking-[0.7em]"
      >
        <span class="relative z-10 flex items-center justify-center gap-2 jetbrains-mono-600">
          Enter Interface <ChevronRight size={14} />
        </span>
        <div
          class="absolute inset-0 bg-linear-to-r from-transparent via-emerald-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
        ></div>
      </button>

      <div class="mt-8 pt-8 border-t border-white/5 flex justify-between jetbrains-mono-400">
        <div class="space-y-1">
          <p class="text-[8px] text-zinc-600 uppercase">Latency</p>
          <p class="text-[10px] text-emerald-500/50">0.002ms</p>
        </div>
        <div class="space-y-1 text-right">
          <p class="text-[8px] text-zinc-600 uppercase">Protocol</p>
          <p class="text-[10px] text-zinc-400">LATTICE_v2</p>
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  :global(body) {
    background: #020202;
    color: white;
  }
</style>
