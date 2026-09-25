<script lang="ts">
  /**
   * Method B — attach a whole file to the end of another file.
   *
   * The file you attach can be recovered later, and the combined file still opens
   * normally. Extraction also scans for data hidden by *other* tools, so this can open
   * files made elsewhere as well as our own.
   */
  import FileDrop from './FileDrop.svelte';
  import Panel from './Panel.svelte';
  import Recon, { type LogLine } from './Recon.svelte';
  import { attachFile, carveFile, detachFile, seal, unseal, StegClientError } from '$lib/steg/client';
  import { friendlyError } from '$lib/steg/messages';
  import { downloadBytes, formatBytes, isPng, readFileBytes } from '$lib/steg/image';
  import type { CarveCandidate } from '$lib/steg/types';
  import { Download, FileArchive, Lock, LockOpen, PackageOpen, Scissors } from 'lucide-svelte';

  type Mode = 'encode' | 'decode';

  let mode: Mode = $state('encode');

  // --- encode ---
  let decoyFile: File | null = $state(null);
  let decoyBytes: Uint8Array | null = $state(null);
  let secretFile: File | null = $state(null);
  let secretBytes: Uint8Array | null = $state(null);
  let usePassword = $state(false);
  let password = $state('');
  let busy = $state(false);
  let output: Uint8Array | null = $state(null);
  let outputName = $state('');
  let error = $state('');

  // --- decode ---
  let containerFile: File | null = $state(null);
  let containerBytes: Uint8Array | null = $state(null);
  let hidden: { name: string; mime: string; payload: Uint8Array } | null = $state(null);
  let needsPassword = $state(false);
  let decodePassword = $state('');
  let candidates: CarveCandidate[] = $state([]);
  let eof = $state(0);
  let restoredDecoy: Uint8Array | null = $state(null);

  let logs: LogLine[] = $state([{ time: now(), msg: 'Ready.', tone: 'sys' }]);

  function now() {
    return new Date().toTimeString().slice(0, 8);
  }

  function log(msg: string, tone: LogLine['tone'] = 'sys') {
    logs = [...logs.slice(-12), { time: now(), msg, tone }];
  }

  function report(err: unknown) {
    const code = err instanceof StegClientError ? err.code : 'UNKNOWN';
    const raw = err instanceof Error ? err.message : String(err);
    error = friendlyError(code, raw);
    log(error, 'err');
  }

  async function pickDecoy(file: File) {
    decoyFile = file;
    decoyBytes = await readFileBytes(file);
    output = null;
    log(`${file.name} selected.`);
  }

  async function pickSecret(file: File) {
    secretFile = file;
    secretBytes = await readFileBytes(file);
    output = null;
    log(`${file.name} will be hidden inside.`);
  }

  async function runAttach() {
    if (!decoyBytes || !secretFile || !secretBytes) return;
    busy = true;
    error = '';
    try {
      let payload = secretBytes;
      let name = secretFile.name;

      if (usePassword) {
        if (!password) {
          busy = false;
          return log('Type a password, or turn password protection off.', 'err');
        }
        log('Locking the file with your password…');
        payload = await seal(payload, password);
        // The original filename is readable metadata, so hide it too.
        name = `${secretFile.name}.enc`;
        log('Locked.');
      }

      output = await attachFile(decoyBytes, name, secretFile.type || 'application/octet-stream', payload);
      const stem = (decoyFile?.name ?? 'file').replace(/\.[^.]+$/, '');
      const ext = decoyFile?.name.split('.').pop() ?? 'bin';
      outputName = `${stem}-with-hidden-file.${ext}`;

      log(`Done. ${outputName} is ${formatBytes(output.length)}.`, 'ok');
    } catch (err) {
      report(err);
    } finally {
      busy = false;
    }
  }

  async function pickContainer(file: File) {
    containerFile = file;
    containerBytes = await readFileBytes(file);
    hidden = null;
    candidates = [];
    needsPassword = false;
    error = '';
    log(`Looking inside ${file.name}…`);
    await runInspect();
  }

  async function runInspect() {
    if (!containerBytes) return;
    busy = true;
    try {
      const scan = await carveFile(containerBytes);
      eof = scan.eof;
      candidates = scan.candidates;
      const extra = containerBytes.length - scan.eof;
      log(extra > 0 ? `The picture ends ${formatBytes(extra)} before the end of the file.` : 'The file ends where the picture ends.');

      try {
        const result = await detachFile(containerBytes);
        hidden = result.hidden;
        restoredDecoy = result.decoy;
        log(`Found a hidden file: ${result.hidden.name} (${formatBytes(result.hidden.payload.length)}).`, 'ok');

        if (looksEncrypted(result.hidden.name, result.hidden.payload)) {
          needsPassword = true;
          log('It is password protected.', 'warn');
        } else {
          log('Ready to download.', 'ok');
        }
      } catch {
        log('No file attached by masc.', 'warn');
        log(
          candidates.length > 0
            ? `Found ${candidates.length} possible file(s) in the extra data.`
            : 'Nothing hidden found in this file.',
          candidates.length > 0 ? 'warn' : 'sys'
        );
      }
    } catch (err) {
      report(err);
    } finally {
      busy = false;
    }
  }

  /**
   * A `.enc` suffix is our own marker, but a renamed file should still be recognised, so
   * the envelope magic is checked too.
   */
  function looksEncrypted(name: string, payload: Uint8Array) {
    return name.endsWith('.enc') || startsWith(payload, 'STGECRY1');
  }

  function startsWith(bytes: Uint8Array, text: string) {
    if (bytes.length < text.length) return false;
    for (let i = 0; i < text.length; i++) if (bytes[i] !== text.charCodeAt(i)) return false;
    return true;
  }

  async function runUnseal() {
    if (!hidden || !decodePassword) return;
    busy = true;
    try {
      const plaintext = await unseal(hidden.payload, decodePassword);
      hidden = { ...hidden, name: hidden.name.replace(/\.enc$/, ''), payload: plaintext };
      needsPassword = false;
      log('Unlocked.', 'ok');
    } catch (err) {
      report(err);
    } finally {
      busy = false;
    }
  }
</script>

<div class="space-y-3">
  <div class="flex gap-1 bg-zinc-900 p-1 w-fit">
    {#each [['encode', 'Hide a file'], ['decode', 'Open a file']] as [value, text]}
      <button
        onclick={() => (mode = value as Mode)}
        class="px-4 py-1.5 text-[11px] font-semibold transition-colors font-mono
          {mode === value ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-zinc-300'}"
      >
        {text}
      </button>
    {/each}
  </div>

  {#if mode === 'encode'}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Panel title="1. The file to hide inside" tone={decoyFile ? 'ok' : 'idle'}>
        <FileDrop
          label="Cover file"
          file={decoyFile}
          hint="A picture, PDF or video. It must still open normally afterwards."
          onselect={pickDecoy}
          onclear={() => {
            decoyFile = null;
            decoyBytes = null;
            output = null;
          }}
        />
      </Panel>

      <Panel title="2. The file to hide" tone={secretFile ? 'ok' : 'idle'}>
        <div class="space-y-3">
          <FileDrop
            label="Hidden file"
            file={secretFile}
            hint="Anything at all."
            onselect={pickSecret}
            onclear={() => {
              secretFile = null;
              secretBytes = null;
              output = null;
            }}
          />

          <label class="flex items-center gap-2 cursor-pointer text-xs text-zinc-400">
            <input type="checkbox" bind:checked={usePassword} class="accent-emerald-500 w-3.5 h-3.5" />
            <Lock size={12} class={usePassword ? 'text-emerald-500' : 'text-zinc-600'} />
            Protect it with a password
          </label>

          {#if usePassword}
            <input
              type="password"
              bind:value={password}
              placeholder="Password"
              class="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-sm text-white font-mono
                placeholder-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p class="text-[11px] text-zinc-600 leading-relaxed">
              Also hides the file's name, which would otherwise be readable.
            </p>
          {/if}

          <button
            onclick={runAttach}
            disabled={busy || !decoyFile || !secretFile}
            class="w-full py-2.5 bg-emerald-500 text-black text-[11px] font-bold tracking-widest uppercase transition-colors hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600
              disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FileArchive size={14} />
            {busy ? 'Working…' : 'Hide it'}
          </button>

          {#if error}
            <p class="text-[11px] text-red-400 leading-relaxed">{error}</p>
          {/if}

          {#if output}
            <div class="border-t border-zinc-800 pt-3 space-y-2">
              <p class="text-[11px] font-mono text-zinc-400 truncate">{outputName} · {formatBytes(output.length)}</p>
              <button
                onclick={() => output && downloadBytes(output, outputName, decoyFile?.type)}
                class="w-full py-2 border border-zinc-700 text-zinc-200 text-[11px] font-bold tracking-widest
                  uppercase hover:border-emerald-500 hover:text-emerald-500 transition-colors
                  flex items-center justify-center gap-2"
              >
                <Download size={13} /> Download
              </button>
            </div>
          {/if}
        </div>
      </Panel>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Panel title="Choose a file" tone={containerFile ? 'ok' : 'idle'}>
        <div class="space-y-3">
          <FileDrop
            label="File to open"
            file={containerFile}
            hint="Ours, or one made by another tool."
            onselect={pickContainer}
            onclear={() => {
              containerFile = null;
              containerBytes = null;
              hidden = null;
              candidates = [];
              restoredDecoy = null;
            }}
          />

          {#if containerBytes}
            <p class="text-[11px] text-zinc-500 font-mono">
              Picture ends at byte {eof.toLocaleString()} of {containerBytes.length.toLocaleString()}
            </p>
          {/if}

          {#if error}
            <p class="text-[11px] text-red-400 leading-relaxed">{error}</p>
          {/if}
        </div>
      </Panel>

      <Panel title="What was found" tone={hidden || candidates.length ? 'ok' : 'idle'}>
        <div class="space-y-3">
          {#if needsPassword && hidden}
            <div class="space-y-2">
              <p class="text-[11px] text-amber-400">This file is password protected.</p>
              <input
                type="password"
                bind:value={decodePassword}
                placeholder="Password"
                onkeydown={(e) => e.key === 'Enter' && runUnseal()}
                class="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-sm text-white font-mono
                  placeholder-zinc-700 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                onclick={runUnseal}
                disabled={busy || !decodePassword}
                class="w-full py-2 bg-amber-500 text-black text-[10px] font-bold tracking-widest uppercase
                  hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
              >
                Unlock
              </button>
            </div>
          {/if}

          {#if hidden}
            <div class="border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
              <p class="text-emerald-400 text-sm font-mono truncate">{hidden.name}</p>
              <p class="text-[10px] text-zinc-500 font-mono">{formatBytes(hidden.payload.length)}</p>
              <div class="flex gap-2">
                <button
                  onclick={() => hidden && downloadBytes(hidden.payload, hidden.name, hidden.mime)}
                  class="flex-1 py-1.5 border border-emerald-500/50 text-emerald-500 text-[10px] font-bold tracking-widest
                    uppercase hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download size={12} /> Hidden file
                </button>
                {#if restoredDecoy}
                  <button
                    onclick={() => restoredDecoy && downloadBytes(restoredDecoy, `${containerFile?.name ?? 'file'} (clean)`, containerFile?.type)}
                    class="flex-1 py-1.5 border border-zinc-700 text-zinc-400 text-[10px] font-bold tracking-widest
                      uppercase hover:text-zinc-200 transition-colors"
                  >
                    Original file
                  </button>
                {/if}
              </div>
            </div>
          {/if}

          {#if candidates.length > 0}
            <div>
              <p class="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-1.5 flex items-center gap-1.5">
                <Scissors size={12} /> Possible files in the extra data
              </p>
              <div class="space-y-1">
                {#each candidates as candidate (candidate.offset + candidate.kind)}
                  <div class="flex items-center justify-between gap-2 border border-zinc-800 px-2.5 py-1.5">
                    <div class="min-w-0">
                      <p class="text-zinc-300 text-xs font-mono">{candidate.kind}</p>
                      <p class="text-[10px] text-zinc-600 font-mono">
                        {candidate.length === null ? 'size unknown' : formatBytes(candidate.length)}
                      </p>
                    </div>
                    <button
                      onclick={() => downloadBytes(candidate.payload, candidate.suggestedName, candidate.mime)}
                      class="shrink-0 p-1.5 border border-zinc-800 text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/50 transition-colors"
                      aria-label="Download the {candidate.kind} found at {candidate.offset}"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          {#if !hidden && candidates.length === 0 && containerFile && !busy}
            <div class="py-8 flex flex-col items-center justify-center text-zinc-700 gap-2">
              <PackageOpen size={22} />
              <p class="text-[11px] font-mono">Nothing hidden in this file</p>
            </div>
          {/if}
        </div>
      </Panel>
    </div>
  {/if}

  <Recon lines={logs} />
</div>
