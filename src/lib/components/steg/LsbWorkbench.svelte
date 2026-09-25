<script lang="ts">
  /**
   * Method A — hide a message inside a picture.
   *
   * Each colour value (0-255) is stored as 8 bits. We overwrite the very last bit of each
   * red, green and blue value with a bit of your message. One bit per colour means a
   * 1-megapixel picture can hide roughly 370,000 characters, and the change is far too
   * small to see.
   */
  import FileDrop from './FileDrop.svelte';
  import Panel from './Panel.svelte';
  import Recon, { type LogLine } from './Recon.svelte';
  import {
    capacityBits,
    embedText,
    engineInfo,
    extractText,
    seal,
    unseal,
    StegClientError
  } from '$lib/steg/client';
  import { describeCapacity, friendlyError } from '$lib/steg/messages';
  import {
    decodeImage,
    decodeText,
    downloadBytes,
    encodePng,
    encodeText,
    formatBytes,
    isDecodableImage,
    type DecodedImage
  } from '$lib/steg/image';
  import type { EmbedReport, ExtractReport, Planes } from '$lib/steg/types';
  import { Copy, Download, Download as Save, Lock, KeyRound, Sparkles } from 'lucide-svelte';
  import { onMount } from 'svelte';

  type Mode = 'encode' | 'decode';

  let mode: Mode = $state('encode');

  // --- hide ---
  let image: DecodedImage | null = $state(null);
  let imageFile: File | null = $state(null);
  let message = $state('');
  let password = $state('');
  let usePassword = $state(false);
  let planes: Planes = $state(1);
  let capacity = $state(0);
  let busy = $state(false);
  let resultBlob: Blob | null = $state(null);
  let resultUrl = $state('');
  let resultName = $state('');
  let report: EmbedReport | null = $state(null);
  let error = $state('');

  // --- read ---
  let carrier: DecodedImage | null = $state(null);
  let carrierFile: File | null = $state(null);
  /** Cached so the password prompt does not have to re-read the image. */
  let extracted: ExtractReport | null = $state(null);
  let recovered = $state('');
  let needsPassword = $state(false);
  let readPassword = $state('');
  let copied = $state(false);

  let logs: LogLine[] = $state([{ time: now(), msg: 'Ready.', tone: 'sys' }]);

  function now() {
    return new Date().toTimeString().slice(0, 8);
  }

  function log(msg: string, tone: LogLine['tone'] = 'sys') {
    logs = [...logs.slice(-12), { time: now(), msg, tone }];
  }

  function reportError(err: unknown) {
    const code = err instanceof StegClientError ? err.code : 'UNKNOWN';
    const raw = err instanceof Error ? err.message : String(err);
    error = friendlyError(code, raw);
    log(error, 'err');
  }

  // Recomputed whenever the picture or the depth changes, so the user sees how much room
  // they have before they type. The token guards against a slow reply for an old picture
  // landing after a new one was chosen.
  let capacityToken = 0;

  $effect(() => {
    const current = image;
    const chosen = planes;
    const token = ++capacityToken;

    if (!current) {
      capacity = 0;
      return;
    }
    capacityBits(current.rgba, current.width, current.height, chosen)
      .then((bits) => {
        if (token !== capacityToken) return;
        capacity = bits;
      })
      .catch((err) => token === capacityToken && reportError(err));
  });

  async function pickImage(file: File) {
    error = '';
    report = null;
    try {
      const decoded = await decodeImage(file, file.name);
      if (!isDecodableImage(decoded.mime)) {
        log(`${decoded.mime} may not be readable as a picture.`, 'warn');
      }
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      image = decoded;
      imageFile = file;
      imageUrl = URL.createObjectURL(file);
      log(`${file.name} selected.`);
      if (decoded.mime === 'image/jpeg') {
        log('This is a JPEG. The download will be a PNG, which is what keeps the message safe.', 'warn');
      }
    } catch (err) {
      reportError(err);
    }
  }

  function clearImage() {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    image = null;
    imageFile = null;
    imageUrl = '';
    report = null;
  }

  let imageUrl = $state('');

  async function runEncode() {
    if (!image) return;
    if (!message.trim()) return log('Type a message to hide first.', 'err');

    busy = true;
    error = '';
    try {
      const plaintext = encodeText(message);

      // Optional step: lock the message so the picture alone is not enough to read it.
      let payload = plaintext;
      let encrypted = false;
      if (usePassword) {
        if (!password) {
          busy = false;
          return log('Type a password, or turn password protection off.', 'err');
        }
        log('Locking your message…');
        payload = await seal(plaintext, password);
        encrypted = true;
        log('Locked.');
      }

      const { rgba, report: r } = await embedText(
        image.rgba,
        image.width,
        image.height,
        payload,
        encrypted,
        planes
      );
      report = r;
      log(`Hidden in ${r.carriers.toLocaleString()} pixels.`, 'ok');

      // Must be PNG. JPEG re-compresses and would destroy the bits we just wrote.
      const blob = await encodePng(rgba, image.width, image.height);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultBlob = blob;
      resultUrl = URL.createObjectURL(blob);
      resultName = `${image.name.replace(/\.[^.]+$/, '')}-with-message.png`;
      log('Done. Download it and keep that exact file.', 'ok');
    } catch (err) {
      reportError(err);
    } finally {
      busy = false;
    }
  }

  async function pickCarrier(file: File) {
    error = '';
    recovered = '';
    extracted = null;
    needsPassword = false;
    try {
      const decoded = await decodeImage(file, file.name);
      carrier = decoded;
      carrierFile = file;
      log(`Looking inside ${file.name}…`);
      if (decoded.mime !== 'image/png') {
        log('Only PNG files can carry a hidden message. This one probably cannot be read.', 'warn');
      }
      await runExtract();
    } catch (err) {
      reportError(err);
    }
  }

  async function runExtract() {
    if (!carrier) return;
    busy = true;
    error = '';
    try {
      const result = await extractText(carrier.rgba, carrier.width, carrier.height);
      extracted = result;
      needsPassword = result.encrypted;
      log('Found a hidden message.', 'ok');

      if (result.encrypted) {
        log('It is password protected.', 'warn');
        recovered = '';
        return;
      }
      recovered = decodeText(result.payload);
      log(`${recovered.length.toLocaleString()} characters recovered.`, 'ok');
    } catch (err) {
      reportError(err);
    } finally {
      busy = false;
    }
  }

  async function runUnseal() {
    if (!extracted || !readPassword) return;
    busy = true;
    try {
      const plaintext = await unseal(extracted.payload, readPassword);
      recovered = decodeText(plaintext);
      needsPassword = false;
      log('Unlocked.', 'ok');
    } catch (err) {
      reportError(err);
    } finally {
      busy = false;
    }
  }

  async function copyRecovered() {
    await navigator.clipboard.writeText(recovered);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  // Surface which engine is live. `onMount` because there is no `Worker` global during
  // server-side rendering.
  onMount(() => {
    engineInfo()
      .then((info) => log(info.backend === 'wasm' ? 'Ready (fast engine).' : 'Ready.'))
      .catch(() => {});
  });
</script>

<div class="space-y-3">
  <div class="flex gap-1 bg-zinc-900 p-1 w-fit">
    {#each [['encode', 'Hide a message'], ['decode', 'Read a message']] as [value, text]}
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
      <Panel title="1. Choose a picture" tone={image ? 'ok' : 'idle'}>
        <div class="space-y-3">
          <FileDrop
            label="Cover picture"
            accept="image/png,image/jpeg,image/webp,image/bmp,image/avif,image/gif"
            file={imageFile}
            hint="PNG works best. Larger pictures hold more."
            onselect={pickImage}
            onclear={clearImage}
          />

          {#if imageUrl}
            <img src={imageUrl} alt="Preview of the selected file" class="w-full max-h-56 object-contain border border-zinc-800" />
          {/if}

          {#if image}
            <div class="flex gap-2 text-[11px]">
              <div class="flex-1 border border-zinc-800 px-2.5 py-1.5">
                <p class="text-zinc-600 text-[9px] uppercase tracking-widest">Size</p>
                <p class="text-zinc-300 font-mono">{image.width}×{image.height}</p>
              </div>
              <div class="flex-1 border border-zinc-800 px-2.5 py-1.5">
                <p class="text-zinc-600 text-[9px] uppercase tracking-widest">Room for</p>
                <p class="text-emerald-400 font-mono">{describeCapacity(capacity)}</p>
              </div>
            </div>

            <div>
              <p class="text-[10px] text-zinc-600 mb-1.5">How deeply to hide</p>
              <div class="flex gap-1 bg-zinc-900 p-1">
                {#each [[1, 'Normal'], [2, 'Deeper (harder to see) — but 2× room']] as [value, text]}
                  <button
                    onclick={() => (planes = value as Planes)}
                    class="flex-1 px-2 py-1 text-[10px] font-mono transition-colors
                      {planes === value ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}"
                  >
                    {text}
                  </button>
                {/each}
              </div>
              {#if planes === 2}
                <p class="text-[10px] text-amber-500/80 mt-1.5 leading-relaxed">
                  Fits twice as much, but smooth areas of the picture can start to look banded.
                </p>
              {/if}
            </div>
          {/if}
        </div>
      </Panel>

      <Panel title="2. Write your message" tone={report ? 'ok' : 'idle'}>
        <div class="space-y-3">
          <textarea
            bind:value={message}
            rows="5"
            placeholder="Anything you like. A password, an address, a sentence."
            aria-label="Message to hide"
            class="w-full bg-zinc-900/30 border border-zinc-800 p-3 text-sm text-white font-mono
              placeholder-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors resize-y"
          ></textarea>

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
              Strongly recommended. Without a password anyone who has the picture can read
              your message. If you forget the password, the message cannot be recovered.
            </p>
          {/if}

          <button
            onclick={runEncode}
            disabled={busy || !image || !message.trim()}
            class="w-full py-2.5 bg-emerald-500 text-black text-[11px] font-bold tracking-widest uppercase transition-colors hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600
              disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            {busy ? 'Working…' : 'Hide it'}
          </button>

          {#if error}
            <p class="text-[11px] text-red-400 leading-relaxed">{error}</p>
          {/if}

          {#if resultBlob}
            <div class="border-t border-zinc-800 pt-3 space-y-2">
              <img src={resultUrl} alt="Preview of the finished file" class="w-full max-h-56 object-contain border border-zinc-800" />
              <p class="text-[11px] font-mono text-zinc-400 truncate">{resultName} · {formatBytes(resultBlob.size)}</p>
              {#if report}
                <p class="text-[10px] text-zinc-600">
                  Changed {report.bitsWritten.toLocaleString()} single bits. Not enough to alter how it looks.
                </p>
              {/if}
              <button
                onclick={() => resultBlob && downloadBytes(resultBlob, resultName)}
                class="w-full py-2 border border-emerald-500/50 text-emerald-500 text-[11px] font-bold tracking-widest
                  uppercase hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={13} /> Download
              </button>
              <p class="text-[10px] text-amber-500/80 leading-relaxed">
                Keep this exact file. Uploading it to a social app or opening it in an
                editor that re-saves it will erase the message.
              </p>
            </div>
          {/if}
        </div>
      </Panel>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Panel title="Choose the picture" tone={carrier ? 'ok' : 'idle'}>
        <div class="space-y-3">
          <FileDrop
            label="Picture to read"
            accept="image/png,image/jpeg,image/webp,image/bmp,image/avif,image/gif"
            file={carrierFile}
            hint="Use the original download, not a screenshot or a re-saved copy."
            onselect={pickCarrier}
            onclear={() => {
              carrier = null;
              carrierFile = null;
              extracted = null;
              recovered = '';
            }}
          />

          {#if needsPassword}
            <div class="space-y-2">
              <p class="text-[11px] text-amber-400 flex items-center gap-1.5">
                <KeyRound size={12} /> This message is password protected.
              </p>
              <input
                type="password"
                bind:value={readPassword}
                placeholder="Password"
                onkeydown={(e) => e.key === 'Enter' && runUnseal()}
                class="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-sm text-white font-mono
                  placeholder-zinc-700 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                onclick={runUnseal}
                disabled={busy || !readPassword}
                class="w-full py-2 bg-amber-500 text-black text-[10px] font-bold tracking-widest uppercase
                  hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
              >
                Unlock
              </button>
            </div>
          {/if}

          {#if error}
            <p class="text-[11px] text-red-400 leading-relaxed">{error}</p>
          {/if}
        </div>
      </Panel>

      <Panel title="The message" tone={recovered ? 'ok' : 'idle'}>
        {#if recovered}
          <div class="space-y-2">
            <pre
              class="bg-black border border-emerald-500/20 p-3 text-sm text-emerald-400 font-mono whitespace-pre-wrap
                break-words max-h-64 overflow-y-auto">{recovered}</pre>
            <div class="flex gap-2">
              <button
                onclick={copyRecovered}
                class="flex-1 py-2 border border-zinc-700 text-zinc-200 text-[10px] font-bold tracking-widest
                  uppercase hover:border-emerald-500 hover:text-emerald-500 transition-colors
                  flex items-center justify-center gap-1.5"
              >
                <Copy size={12} /> {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onclick={() => downloadBytes(encodeText(recovered), 'recovered-message.txt', 'text/plain')}
                class="flex-1 py-2 border border-zinc-700 text-zinc-200 text-[10px] font-bold tracking-widest
                  uppercase hover:border-emerald-500 hover:text-emerald-500 transition-colors
                  flex items-center justify-center gap-1.5"
              >
                <Save size={12} /> Save
              </button>
            </div>
          </div>
        {:else if carrier && !busy && !needsPassword && !error}
          <div class="py-8 flex flex-col items-center justify-center text-zinc-700 gap-2">
            <p class="text-[11px] font-mono">No message found</p>
          </div>
        {/if}
      </Panel>
    </div>
  {/if}

  <Recon lines={logs} />
</div>
