<script lang="ts">
  /**
   * Documentation.
   *
   * This is the reference for everything the workbench does: both methods, the optional
   * password layer, why PNG is mandatory, how to read a file without this app, and the
   * exact byte layout. The format tables here mirror `docs/STEGO_FORMAT.md`, which is the
   * normative version.
   */
  import PageShell from '$lib/components/pages/PageShell.svelte';
  import Code from '$lib/components/pages/Code.svelte';
  import { TriangleAlert, Info } from 'lucide-svelte';

  const sections = [
    { id: 'start', label: 'Getting started' },
    { id: 'method-a', label: 'Method A — hide a message' },
    { id: 'method-b', label: 'Method B — hide a file' },
    { id: 'password', label: 'Password protection' },
    { id: 'png', label: 'Why PNG only' },
    { id: 'limits', label: 'Limits and capacity' },
    { id: 'problems', label: 'If something goes wrong' },
    { id: 'outside', label: 'Reading files without this app' },
    { id: 'format', label: 'File format reference' },
    { id: 'engines', label: 'Engines and building' },
    { id: 'privacy', label: 'Privacy' }
  ];

  const problems = [
    {
      symptom: '“No hidden message found in this file.”',
      cause: 'There is no masc container in it, or you picked the wrong file.',
      fix: 'Make sure you are using the file you downloaded, not a copy. If the message was hidden by a different tool, try Method B — it can carve files made elsewhere.'
    },
    {
      symptom: '“The file looks encoded, but its pixels have changed.”',
      cause: 'The image was re-saved, re-compressed, resized or screenshotted after the message was hidden.',
      fix: 'Get the original file again. There is no way to recover a payload whose bits have been overwritten — that is the whole fragility of the method.'
    },
    {
      symptom: '“The message is too big for this image.”',
      cause: 'The text needs more bits than the picture has room for.',
      fix: 'Use a larger picture, shorten the message, or switch to “Deeper” to double the room.'
    },
    {
      symptom: '“That password is not right.”',
      cause: 'The password is wrong, or the file has changed since it was hidden.',
      fix: 'There is no recovery. The password is never stored, so nobody — including us — can check it for you.'
    },
    {
      symptom: 'The message shows up as garbled symbols.',
      cause: 'You are decoding a file that contains binary rather than text.',
      fix: 'That is expected for Method B. Download it as a file instead of reading it on screen.'
    }
  ];

  const signatures = [
    ['ZIP', 'PK\\x03\\x04', 'Exact size, from the archive index'],
    ['PDF', '%PDF-', 'To end of file'],
    ['PNG', '\\x89PNG\\r\\n\\x1a\\n', 'To end of file'],
    ['JPEG', '\\xFF\\xD8\\xFF', 'To end of file'],
    ['GIF', 'GIF8', 'To end of file'],
    ['RIFF / AVI / WAV', 'RIFF', 'To end of file'],
    ['WEBP', 'RIFF…WEBP', 'To end of file'],
    ['RAR', 'Rar!\\x1a\\x07', 'To end of file'],
    ['7Z', '7z\\xBC\\xAF\\x27\\x1C', 'To end of file'],
    ['GZIP', '\\x1F\\x8B\\x08', 'To end of file'],
    ['BZIP2', 'BZh', 'To end of file'],
    ['XZ', '\\xFD7zXZ\\x00', 'To end of file'],
    ['MP4 / MOV', '…ftyp', 'To end of file'],
    ['OGG', 'OggS', 'To end of file'],
    ['SQLite', 'SQLite format 3\\0', 'To end of file'],
    ['TAR', 'ustar (at +257)', 'To end of file'],
    ['ELF', '\\x7FELF', 'To end of file'],
    ['EXE', 'MZ', 'To end of file'],
    ['MP3', 'ID3', 'To end of file']
  ];
</script>

<PageShell
  eyebrow="// Documentation"
  title="Everything the workbench does"
  lede="How both hiding methods work, what they cannot do, and how to read a file without this app. No account, no upload — every step below happens in your browser."
>
  <div class="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-10">
    <!-- Table of contents -->
    <nav class="hidden lg:block">
      <div class="sticky top-6">
        <p class="text-[9px] text-zinc-700 uppercase tracking-[0.25em] mb-3">On this page</p>
        <ul class="space-y-1.5">
          {#each sections as section}
            <li>
              <a
                href="#{section.id}"
                class="text-[11px] text-zinc-500 hover:text-emerald-500 transition-colors block"
              >
                {section.label}
              </a>
            </li>
          {/each}
        </ul>
      </div>
    </nav>

    <div class="min-w-0 space-y-14">
      <!-- ── Getting started ─────────────────────────────────────────── -->
      <section id="start" class="scroll-mt-6">
        <h2 class="text-lg font-bold text-white mb-3">Getting started</h2>
        <p class="text-sm leading-relaxed mb-4">
          Pick one of the two methods. Neither needs an account, and nothing you choose is
          ever sent anywhere.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="/steg" class="border border-zinc-800 p-4 hover:border-emerald-500/50 transition-colors">
            <p class="text-emerald-400 text-sm font-bold mb-1">In a picture</p>
            <p class="text-xs text-zinc-500 leading-relaxed">
              Hide a message inside an image. The picture looks identical and opens normally.
            </p>
          </a>
          <a href="/steg" class="border border-zinc-800 p-4 hover:border-emerald-500/50 transition-colors">
            <p class="text-emerald-400 text-sm font-bold mb-1">Inside a file</p>
            <p class="text-xs text-zinc-500 leading-relaxed">
              Attach a whole file to a picture, PDF or video. Extract it again later.
            </p>
          </a>
        </div>
      </section>

      <!-- ── Method A ────────────────────────────────────────────────── -->
      <section id="method-a" class="scroll-mt-6">
        <h2 class="text-lg font-bold text-white mb-3">Method A — hide a message</h2>
        <p class="text-sm leading-relaxed mb-4">
          Every colour in a picture is stored as a number from 0 to 255, which is 8 binary
          digits. We replace the very last digit of each red, green and blue value with one
          digit of your message. Three digits per pixel, and the change is far too small to
          see.
        </p>

        <div class="border border-zinc-800 bg-zinc-900/20 p-4 mb-5 space-y-2">
          <p class="text-[10px] text-emerald-500 uppercase tracking-widest">In plain terms</p>
          <p class="text-xs text-zinc-400 leading-relaxed">
            One pixel looks like <span class="text-zinc-200">(200, 130, 45)</span>. Written in
            binary that is three eight-digit numbers. We keep the first seven digits of each and
            replace the last one, thousands of times over. To the eye — and to any photo viewer —
            nothing happened. To a program reading the raw digits, your message is sitting right
            there.
          </p>
        </div>

        <h3 class="text-sm font-bold text-white mt-6 mb-2">Steps</h3>
        <ol class="space-y-2 text-sm list-decimal list-inside text-zinc-400">
          <li>Choose a picture. PNG works best; see <a href="#png" class="text-emerald-500 hover:underline">why PNG only</a>.</li>
          <li>The app measures how many characters will fit and shows you.</li>
          <li>Type your message. Optionally set a password.</li>
          <li>Press <span class="text-zinc-200">Hide it</span>, then download the result.</li>
          <li>Keep that exact file. See <a href="#png" class="text-emerald-500 hover:underline">why PNG only</a>.</li>
        </ol>

        <h3 class="text-sm font-bold text-white mt-6 mb-2">Reading it back</h3>
        <p class="text-sm leading-relaxed mb-3">
          Open the workbench, switch to <span class="text-zinc-200">Read a message</span>, and
          choose the file. If you set a password, it will ask for it. The message appears
          immediately — there is nothing to click.
        </p>

        <h3 class="text-sm font-bold text-white mt-6 mb-3">Normal vs Deeper</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="border border-zinc-800 p-4">
            <p class="text-zinc-200 text-xs font-bold mb-1">Normal</p>
            <p class="text-[11px] text-zinc-500 leading-relaxed">
              Uses the last digit of each colour. Roughly 1 character per 2.7 pixels. Completely
              invisible.
            </p>
          </div>
          <div class="border border-zinc-800 p-4">
            <p class="text-zinc-200 text-xs font-bold mb-1">Deeper</p>
            <p class="text-[11px] text-zinc-500 leading-relaxed">
              Uses the last two digits of each colour, doubling the room. Smooth areas of the
              picture can start to look faintly banded.
            </p>
          </div>
        </div>
      </section>

      <!-- ── Method B ────────────────────────────────────────────────── -->
      <section id="method-b" class="scroll-mt-6">
        <h2 class="text-lg font-bold text-white mb-3">Method B — hide a file</h2>
        <p class="text-sm leading-relaxed mb-4">
          The hidden file is attached to the end of the cover file. Nothing about the cover
          changes: it still opens, still plays, still looks the same. This is the same technique
          as the Unix command <code class="text-emerald-500">cat photo.jpg secret.zip &gt; both.jpg</code>,
          tidied up and made reliable.
        </p>

        <h3 class="text-sm font-bold text-white mt-6 mb-2">Steps</h3>
        <ol class="space-y-2 text-sm list-decimal list-inside text-zinc-400">
          <li>Choose the cover file — the one people will see.</li>
          <li>Choose the file to hide. Any format: zip, pdf, a key, a document.</li>
          <li>Optionally set a password. This also hides the file's name.</li>
          <li>Press <span class="text-zinc-200">Hide it</span> and download the result.</li>
        </ol>

        <h3 class="text-sm font-bold text-white mt-6 mb-2">How it is stored</h3>
        <p class="text-sm leading-relaxed mb-3">
          The hidden file is wrapped in a small header naming it, then:
        </p>
        <ul class="space-y-2 text-sm text-zinc-400 list-disc list-inside mb-4">
          <li>
            <span class="text-zinc-200">In a PNG</span> the header goes into an extra
            <code class="text-emerald-500">stEg</code> block placed just before the final
            <code class="text-emerald-500">IEND</code> block. The PNG specification requires
            <code class="text-emerald-500">IEND</code> to come last, so appending past it would
            produce an invalid file. Every image viewer skips unknown blocks, so the picture is
            unaffected.
          </li>
          <li>
            <span class="text-zinc-200">In everything else</span> — JPEG, GIF, PDF, video — it
            is simply appended after the end. Decoders ignore trailing data.
          </li>
        </ul>
        <p class="text-sm leading-relaxed">
          Reading it back gives you two things: the hidden file, and a clean copy of the cover
          file with the hidden data removed, byte for byte.
        </p>

        <h3 class="text-sm font-bold text-white mt-6 mb-3">Opening files made by other tools</h3>
        <p class="text-sm leading-relaxed mb-3">
          If a file was not made by this app, the workbench still inspects everything past the end
          of the picture for known file signatures and offers to carve it out. That covers files
          produced by <code class="text-emerald-500">cat</code>,
          <code class="text-emerald-500">zip -A</code>, ImageSteg, OpenStego and similar.
        </p>
        <div class="overflow-x-auto border border-zinc-800">
          <table class="w-full text-[11px]">
            <thead>
              <tr class="border-b border-zinc-800 text-zinc-600 text-left">
                <th class="px-3 py-2 font-bold uppercase tracking-widest">Type</th>
                <th class="px-3 py-2 font-bold uppercase tracking-widest">Signature</th>
                <th class="px-3 py-2 font-bold uppercase tracking-widest">Length</th>
              </tr>
            </thead>
            <tbody>
              {#each signatures as row}
                <tr class="border-b border-zinc-800/50 last:border-0">
                  <td class="px-3 py-1.5 text-zinc-300">{row[0]}</td>
                  <td class="px-3 py-1.5 text-emerald-500/80">{row[1]}</td>
                  <td class="px-3 py-1.5 text-zinc-600">{row[2]}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <p class="text-[11px] text-zinc-600 mt-2">
          ZIP archives are measured exactly using the archive's own index. Everything else is
          carved to the end of the file.
        </p>
      </section>

      <!-- ── Password ────────────────────────────────────────────────── -->
      <section id="password" class="scroll-mt-6">
        <h2 class="text-lg font-bold text-white mb-3">Password protection</h2>
        <div class="border border-amber-500/25 bg-amber-500/[0.04] p-4 mb-5">
          <p class="text-xs text-amber-400 leading-relaxed flex gap-2.5">
            <TriangleAlert size={14} class="shrink-0 mt-0.5" />
            <span>
              Hiding is not locking. Without a password, anyone who can run this page reads your
              message. There is no key to steal because there is no key — but there is also
              nothing stopping them. Use a password for anything that matters.
            </span>
          </p>
        </div>

        <p class="text-sm leading-relaxed mb-4">
          When you set one, your message is scrambled <em>before</em> it is hidden, so the picture
          on its own reveals nothing. The scramble uses:
        </p>
        <ul class="space-y-2 text-sm text-zinc-400 list-disc list-inside mb-4">
          <li><span class="text-zinc-200">PBKDF2-HMAC-SHA256</span>, 210,000 rounds, to turn your password into a key</li>
          <li>A random 32-byte salt, so two identical passwords never produce the same key</li>
          <li><span class="text-zinc-200">AES-256-GCM</span> encryption with a random 12-byte key ID</li>
          <li>An authentication tag, so a changed file is detected rather than silently mis-read</li>
        </ul>

        <div class="space-y-3 text-sm leading-relaxed">
          <p class="text-zinc-400">
            <span class="text-zinc-200">A wrong password and a changed file look identical.</span>
            That is deliberate. AES-GCM genuinely cannot tell them apart, and telling you which one
            happened would hand an attacker a way to test guesses faster.
          </p>
          <p class="text-zinc-400">
            <span class="text-zinc-200">Your password is never stored or transmitted.</span> It
            exists only in your browser tab while you type it.
          </p>
          <p class="text-zinc-400">
            <span class="text-zinc-200">Lose it and the message is gone.</span> There is no reset
            and no recovery, by anyone.
          </p>
        </div>
      </section>

      <!-- ── PNG ─────────────────────────────────────────────────────── -->
      <section id="png" class="scroll-mt-6">
        <h2 class="text-lg font-bold text-white mb-3">Why PNG only</h2>
        <p class="text-sm leading-relaxed mb-4">
          This is the single most important thing to get right, so it is worth understanding.
        </p>
        <p class="text-sm leading-relaxed mb-4">
          Method A stores your message in the <em>exact</em> number stored for each colour. The
          only way to read it back is for that number to survive untouched. PNG stores every pixel
          value exactly as-is, so a picture saved as PNG comes back bit for bit identical.
        </p>
        <p class="text-sm leading-relaxed mb-5">
          JPEG does not. It works by throwing away colour detail that your eye probably will not
          miss, and the throwaway includes the last digit of every colour — precisely where the
          message is. It is not a matter of quality settings; the data is gone.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="border border-red-900/30 bg-red-950/10 p-4">
            <p class="text-red-400 text-xs font-bold mb-2">Destroys the message</p>
            <ul class="space-y-1.5 text-[11px] text-zinc-400 list-disc list-inside">
              <li>Uploading to X, Discord, Instagram, Facebook</li>
              <li>Re-saving from Photoshop, Preview, or any editor</li>
              <li>Resizing, cropping, rotating</li>
              <li>Screenshots and screen recordings</li>
              <li>Google Drive, Dropbox and similar previews</li>
              <li>“Optimise image” / “Compress” buttons</li>
              <li>Converting to JPEG, or to PDF</li>
            </ul>
          </div>
          <div class="border border-emerald-500/30 bg-emerald-500/[0.04] p-4">
            <p class="text-emerald-400 text-xs font-bold mb-2">Keeps the message</p>
            <ul class="space-y-1.5 text-[11px] text-zinc-400 list-disc list-inside">
              <li>Downloading the file and storing it as-is</li>
              <li>Emailing it as an attachment</li>
              <li>Messaging apps that send files untouched</li>
              <li>Renaming it (the extension does not matter)</li>
              <li>Opening it in a normal image viewer, then closing without saving</li>
            </ul>
          </div>
        </div>

        <div class="border border-zinc-800 bg-zinc-900/20 p-4 mt-5 flex gap-2.5">
          <Info size={14} class="text-zinc-500 shrink-0 mt-0.5" />
          <p class="text-xs text-zinc-400 leading-relaxed">
            If you use a social app, put the picture in a message as a <em>file</em> rather than
            an image. Most apps still re-encode pasted images, but they pass file attachments
            through untouched.
          </p>
        </div>

        <h3 class="text-sm font-bold text-white mt-6 mb-2">Transparent images</h3>
        <p class="text-sm leading-relaxed">
          Only fully opaque pixels are used. Browsers blend semi-transparent pixels when they
          display them, so their colour values are not stable and a message written there would
          rot. If your picture has transparency, the app simply has less room — it will tell you
          how much.
        </p>
      </section>

      <!-- ── Limits ──────────────────────────────────────────────────── -->
      <section id="limits" class="scroll-mt-6">
        <h2 class="text-lg font-bold text-white mb-3">Limits and capacity</h2>
        <div class="overflow-x-auto border border-zinc-800">
          <table class="w-full text-[11px]">
            <thead>
              <tr class="border-b border-zinc-800 text-zinc-600 text-left">
                <th class="px-3 py-2 font-bold uppercase tracking-widest">Picture</th>
                <th class="px-3 py-2 font-bold uppercase tracking-widest">Pixels</th>
                <th class="px-3 py-2 font-bold uppercase tracking-widest">Normal</th>
                <th class="px-3 py-2 font-bold uppercase tracking-widest">Deeper</th>
              </tr>
            </thead>
            <tbody class="text-zinc-400">
              {#each [
                ['Thumbnail 640×480', '307,200', '113,000', '227,000'],
                ['Social post 1200×1200', '1,440,000', '531,000', '1,063,000'],
                ['Web image 1920×1080', '2,073,600', '777,600', '1,555,200'],
                ['Phone photo 4032×3024', '12,192,768', '4,572,000', '9,144,000']
              ] as row}
                <tr class="border-b border-zinc-800/50 last:border-0">
                  <td class="px-3 py-1.5 text-zinc-300">{row[0]}</td>
                  <td class="px-3 py-1.5 font-mono">{row[1]}</td>
                  <td class="px-3 py-1.5 font-mono text-emerald-500/80">{row[2]}</td>
                  <td class="px-3 py-1.5 font-mono text-emerald-500/80">{row[3]}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <p class="text-[11px] text-zinc-600 mt-2">
          Roughly one character per 2.7 pixels. Real capacity is a little lower once the 20-byte
          header and the password overhead are counted. The workbench shows the exact figure for
          your picture before you type anything.
        </p>

        <h3 class="text-sm font-bold text-white mt-6 mb-2">Other limits</h3>
        <ul class="space-y-2 text-sm text-zinc-400 list-disc list-inside">
          <li>Method A needs a lossless format. PNG, WebP and AVIF work. JPEG, GIF and BMP do not.</li>
          <li>Method B works with anything, because nothing is re-encoded.</li>
          <li>Pictures above 40 megapixels are refused, to protect your browser's memory.</li>
          <li>The password layer needs a secure context — <code class="text-emerald-500">https://</code> or <code class="text-emerald-500">localhost</code>.</li>
        </ul>
      </section>

      <!-- ── Problems ────────────────────────────────────────────────── -->
      <section id="problems" class="scroll-mt-6">
        <h2 class="text-lg font-bold text-white mb-3">If something goes wrong</h2>
        <div class="space-y-3">
          {#each problems as problem}
            <div class="border border-zinc-800 p-4">
              <p class="text-xs text-red-400 mb-1.5">{problem.symptom}</p>
              <p class="text-[11px] text-zinc-500 leading-relaxed mb-1.5">
                <span class="text-zinc-600 uppercase tracking-widest text-[9px] mr-1.5">Why</span>{problem.cause}
              </p>
              <p class="text-[11px] text-zinc-400 leading-relaxed">
                <span class="text-emerald-500 uppercase tracking-widest text-[9px] mr-1.5">Fix</span>{problem.fix}
              </p>
            </div>
          {/each}
        </div>
      </section>

      <!-- ── Outside ─────────────────────────────────────────────────── -->
      <section id="outside" class="scroll-mt-6">
        <h2 class="text-lg font-bold text-white mb-3">Reading files without this app</h2>
        <p class="text-sm leading-relaxed mb-4">
          The format is fully documented in <code class="text-emerald-500">docs/STEGO_FORMAT.md</code>,
          so you are not locked in. This reads a Method A message in about twenty lines of Python.
        </p>
        <Code label="python — needs Pillow">
{`import sys, zlib, struct
from PIL import Image

HEADER = b"STEGLSB1"
img = Image.open(sys.argv[1]).convert("RGBA")
px = img.tobytes()

def slots(planes):
    """Yield every writable bit position, in the order the encoder wrote them."""
    for y in range(img.height):
        for x in range(img.width):
            if px[(y * img.width + x) * 4 + 3] != 0xFF:   # opaque pixels only
                continue
            base = (y * img.width + x) * 4
            for plane in range(planes):
                for c in range(3):                        # R, G, B
                    yield base + c, plane

def read(nbytes, planes):
    out = bytearray()
    acc = nbits = 0
    for idx, plane in slots(planes):
        acc = (acc << 1) | ((px[idx] >> plane) & 1)
        nbits += 1
        if nbits == 8:
            out.append(acc); acc = nbits = 0
        if len(out) == nbytes:
            return bytes(out)
    return bytes(out)

for planes in (1, 2):              # the header says which, but you need an order to read it
    header = read(20, planes)
    if header[:8] != HEADER:
        continue
    length, crc = struct.unpack("<II", header[12:20])
    payload = read(20 + length, planes)[20:]
    if zlib.crc32(payload) & 0xFFFFFFFF == crc:
        sys.stdout.buffer.write(payload)
        break
else:
    sys.exit("no hidden message found")`}
        </Code>
      </section>

      <!-- ── Format ──────────────────────────────────────────────────── -->
      <section id="format" class="scroll-mt-6">
        <h2 class="text-lg font-bold text-white mb-3">File format reference</h2>
        <p class="text-sm leading-relaxed mb-5">
          Three markers, all plain ASCII, so you can find them with any hex editor.
        </p>

        <div class="space-y-5">
          <div class="border border-zinc-800">
            <div class="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
              <code class="text-emerald-400 text-xs">STEGLSB1</code>
              <span class="text-[10px] text-zinc-600">Method A container header — 20 bytes</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-[11px]">
                <thead>
                  <tr class="border-b border-zinc-800 text-zinc-600 text-left">
                    <th class="px-3 py-1.5">Offset</th>
                    <th class="px-3 py-1.5">Size</th>
                    <th class="px-3 py-1.5">Field</th>
                  </tr>
                </thead>
                <tbody class="text-zinc-400">
                  {#each [
                    ['0', '8', 'magic "STEGLSB1"'],
                    ['8', '1', 'format version (1)'],
                    ['9', '1', 'flags — bit 0 encrypted, bit 1 two planes'],
                    ['10', '2', 'reserved, zero'],
                    ['12', '4', 'payload length, little-endian'],
                    ['16', '4', 'CRC-32 of the payload, little-endian']
                  ] as row}
                    <tr class="border-b border-zinc-800/50 last:border-0">
                      <td class="px-3 py-1 font-mono text-zinc-600">{row[0]}</td>
                      <td class="px-3 py-1 font-mono text-zinc-600">{row[1]}</td>
                      <td class="px-3 py-1">{row[2]}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <div class="border border-zinc-800">
            <div class="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
              <code class="text-emerald-400 text-xs">STEGAPP1</code>
              <span class="text-[10px] text-zinc-600">Method B trailer</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-[11px]">
                <thead>
                  <tr class="border-b border-zinc-800 text-zinc-600 text-left">
                    <th class="px-3 py-1.5">Offset</th>
                    <th class="px-3 py-1.5">Size</th>
                    <th class="px-3 py-1.5">Field</th>
                  </tr>
                </thead>
                <tbody class="text-zinc-400">
                  {#each [
                    ['0', '8', 'magic "STEGAPP1"'],
                    ['8', '2', 'filename length'],
                    ['10', '2', 'MIME type length'],
                    ['12', '2', 'reserved, zero'],
                    ['14', '4', 'payload length'],
                    ['18', '—', 'filename, UTF-8'],
                    ['—', '—', 'MIME type, UTF-8'],
                    ['—', '—', 'the file itself']
                  ] as row}
                    <tr class="border-b border-zinc-800/50 last:border-0">
                      <td class="px-3 py-1 font-mono text-zinc-600">{row[0]}</td>
                      <td class="px-3 py-1 font-mono text-zinc-600">{row[1]}</td>
                      <td class="px-3 py-1">{row[2]}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <div class="border border-zinc-800">
            <div class="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
              <code class="text-emerald-400 text-xs">STGECRY1</code>
              <span class="text-[10px] text-zinc-600">password layer — 60-byte header, then ciphertext</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-[11px]">
                <thead>
                  <tr class="border-b border-zinc-800 text-zinc-600 text-left">
                    <th class="px-3 py-1.5">Offset</th>
                    <th class="px-3 py-1.5">Size</th>
                    <th class="px-3 py-1.5">Field</th>
                  </tr>
                </thead>
                <tbody class="text-zinc-400">
                  {#each [
                    ['0', '8', 'magic "STGECRY1"'],
                    ['8', '2', 'PBKDF2 rounds'],
                    ['10', '1', 'salt length (32)'],
                    ['11', '32', 'random salt'],
                    ['43', '1', 'key ID length (12)'],
                    ['44', '12', 'random key ID'],
                    ['56', '4', 'ciphertext length'],
                    ['60', '—', 'ciphertext + 16-byte authentication tag']
                  ] as row}
                    <tr class="border-b border-zinc-800/50 last:border-0">
                      <td class="px-3 py-1 font-mono text-zinc-600">{row[0]}</td>
                      <td class="px-3 py-1 font-mono text-zinc-600">{row[1]}</td>
                      <td class="px-3 py-1">{row[2]}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p class="text-[11px] text-zinc-600 mt-4 leading-relaxed">
          Every multi-byte number in these headers is little-endian, except PNG's own block
          length and checksum, which the PNG specification requires to be big-endian.
        </p>
      </section>

      <!-- ── Engines ─────────────────────────────────────────────────── -->
      <section id="engines" class="scroll-mt-6">
        <h2 class="text-lg font-bold text-white mb-3">Engines and building</h2>
        <p class="text-sm leading-relaxed mb-4">
          There are two implementations of the same format, and they produce identical files:
        </p>
        <ul class="space-y-2 text-sm text-zinc-400 list-disc list-inside mb-5">
          <li>
            <span class="text-zinc-200">TypeScript</span> — always available, runs in a Web
            Worker so the page never freezes. This is what you are using unless you built the
            other one.
          </li>
          <li>
            <span class="text-zinc-200">Rust compiled to WebAssembly</span> — faster on very
            large pictures. Optional.
          </li>
        </ul>
        <p class="text-sm leading-relaxed mb-4">
          If you have Rust installed, you can build it. It is not required:
        </p>
        <Code label="bash">npm run build:wasm</Code>
        <p class="text-[11px] text-zinc-600 mt-2 leading-relaxed">
          The app looks for the result at <code class="text-emerald-500">/wasm/steg_core.js</code>.
          If it is not there, the workbench quietly uses the TypeScript engine instead — you do not
          need to do anything, and nothing breaks.
        </p>

        <h3 class="text-sm font-bold text-white mt-6 mb-2">Tests</h3>
        <Code label="bash">npm run test:steg</Code>
        <p class="text-[11px] text-zinc-600 mt-2 leading-relaxed">
          36 tests covering the round trip, capacity limits, corruption detection, transparency
          handling, both PNG storage paths, and the password layer. The Rust core has its own
          equivalent suite: <code class="text-emerald-500">cargo test -p steg-core</code>.
        </p>
      </section>

      <!-- ── Privacy ─────────────────────────────────────────────────── -->
      <section id="privacy" class="scroll-mt-6">
        <h2 class="text-lg font-bold text-white mb-3">Privacy</h2>
        <ul class="space-y-2 text-sm text-zinc-400 list-disc list-inside">
          <li>No account, no sign-in, no analytics.</li>
          <li>No image, message, file or password is uploaded. There is no upload endpoint.</li>
          <li>Everything runs in your browser, inside a Web Worker. You can disconnect and it still works.</li>
          <li>Random values come from your browser's cryptographic random number generator, never from a weaker source.</li>
          <li>The whole tool is open source and the file format is documented, so you can verify any of this.</li>
        </ul>
      </section>
    </div>
  </div>
</PageShell>
