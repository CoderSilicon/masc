<script lang="ts">
  import { signInWithEmailAndPassword } from "firebase/auth";
  import { auth } from "$lib/firebase";
  import { session } from "$lib/session";
  import { goto } from "$app/navigation";

  let email:string = "";
  let password:string = "";
  let error:string = "";
  let loading:boolean = false;

  async function login() {
    error = "";
    loading = true;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      await goto("/");
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  // Already logged in? bounce out
  $: if (!$session.loading && $session.loggedIn) {
    goto("/vault");
  }
</script>

<main
  class="bg-zinc-950 h-screen flex justify-center items-center font-mono p-4"
>
  <div class="w-full max-w-md space-y-4">
    <fieldset
      class="border-2 border-emerald-500 p-6 bg-zinc-900/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
    >
      <legend
        class="px-2 text-emerald-400 font-bold text-2xl uppercase tracking-widest"
      >
        &gt; <span class="text-white">System_Auth</span>
      </legend>

      <div class="space-y-6 mt-4">
        <div class="flex flex-col gap-2">
          <label class="text-emerald-600 text-xs uppercase">User_Identity</label>
          <input
            type="email"
            placeholder="[ ENTER EMAIL ]"
            bind:value={email}
            class="bg-transparent border-b border-emerald-900 focus:border-emerald-400 text-emerald-300 placeholder-emerald-900 outline-none py-2 transition-colors"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-emerald-600 text-xs uppercase">Access_Key</label>
          <input
            type="password"
            placeholder="[ ******** ]"
            bind:value={password}
            class="bg-transparent border-b border-emerald-900 focus:border-emerald-400 text-emerald-300 placeholder-emerald-900 outline-none py-2 transition-colors"
          />
        </div>
      </div>
    </fieldset>

    <div class="flex flex-col gap-3">
      <button
        on:click={login}
        disabled={loading}
        class="group relative overflow-hidden border border-emerald-500 py-3 transition-all hover:bg-emerald-500 hover:text-black text-white active:scale-[0.98]"
      >
        <span class="relative z-10 font-bold uppercase tracking-tighter">
          {loading ? "Establishing Link..." : "Execute Authorization"}
        </span>
        {#if !loading}
          <div
            class="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white"
          ></div>
        {/if}
      </button>

      {#if error}
        <div
          class="bg-red-950/30 border border-red-500 text-red-500 p-2 text-xs uppercase animate-pulse"
        >
          Critical Error: {error}
        </div>
      {/if}
      <div class="space-y-3 pt-2">
        <div class="flex items-center gap-2">
          <div class="h-px flex-1 bg-emerald-900/50"></div>
          <span class="text-[10px] text-emerald-700 uppercase tracking-widest"
            >Secondary_Auth_Methods</span
          >
          <div class="h-px flex-1 bg-emerald-900/50"></div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button
            class="border border-emerald-900 text-emerald-500 py-2 text-xs uppercase hover:bg-emerald-500/10 hover:border-emerald-400 transition-all flex items-center justify-center gap-2"
          >
            <span class="text-emerald-700">::</span> [ Google ]
          </button>

          <button
            class="border border-emerald-900 text-emerald-500 py-2 text-xs uppercase hover:bg-emerald-500/10 hover:border-emerald-400 transition-all flex items-center justify-center gap-2"
          >
            <span class="text-emerald-700">::</span> [ GitHub ]
          </button>
        </div>

        <button
          class="w-full border border-zinc-800 text-zinc-500 py-2 text-xs uppercase hover:text-emerald-400 hover:border-emerald-700 transition-all italic"
        >
          &gt; Bypass_Identity (Guest_Mode)
        </button>
      </div>

      <div
        class="text-[10px] text-emerald-900 uppercase flex justify-between px-1"
      >
        <span>Node: 0x4F2A</span>
        <span>Secure Line: Active</span>
      </div>
    </div>
  </div>
</main>
