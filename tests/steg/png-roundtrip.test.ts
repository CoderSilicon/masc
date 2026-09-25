/**
 * End-to-end test: embed → real PNG on disk-equivalent bytes → decode → extract.
 *
 * The unit tests operate on RGBA buffers directly. This one closes the loop through an
 * actual PNG serialiser and deserialiser (zlib + the chunk format from the spec), because
 * that round trip is the step that silently destroys LSB payloads in the wild. If PNG
 * encoding were ever lossy, or if we started writing pixels in a form PNG normalises,
 * this test would fail even though every other test still passed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, inflateSync } from 'node:zlib';

import { lsbEmbed, lsbExtract, crc32 } from '../../src/lib/steg/core.ts';
import * as crypto from '../../src/lib/steg/crypto.ts';
import { attachTrailer, buildTrailer, detachTrailer, imageEofOffset, pngChunks } from '../../src/lib/steg/core.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

function crc(bytes: Uint8Array): number {
	let c = 0xffffffff;
	for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
	const out = new Uint8Array(12 + data.length);
	out.set([(data.length >>> 24) & 0xff, (data.length >>> 16) & 0xff, (data.length >>> 8) & 0xff, data.length & 0xff], 0);
	for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
	out.set(data, 8);
	const c = crc(out.subarray(4, 8 + data.length));
	out[8 + data.length] = (c >>> 24) & 0xff;
	out[9 + data.length] = (c >>> 16) & 0xff;
	out[10 + data.length] = (c >>> 8) & 0xff;
	out[11 + data.length] = c & 0xff;
	return out;
}

const concat = (a: Uint8Array, b: Uint8Array): Uint8Array => {
	const out = new Uint8Array(a.length + b.length);
	out.set(a, 0);
	out.set(b, a.length);
	return out;
};

/** Serialise RGBA as a real 8-bit truecolour+alpha PNG. */
function encodePng(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
	const ihdr = new Uint8Array(13);
	const view = new DataView(ihdr.buffer);
	view.setUint32(0, width);
	view.setUint32(4, height);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // colour type: RGBA
	// 10..12 default to deflate / adaptive filtering / no interlace.

	// Each scanline is prefixed with filter type 0 (None).
	const stride = width * 4;
	const raw = new Uint8Array(height * (stride + 1));
	for (let y = 0; y < height; y++) {
		raw[y * (stride + 1)] = 0;
		raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
	}

	return concat(
		new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		concat(chunk('IHDR', ihdr), concat(chunk('IDAT', new Uint8Array(deflateSync(raw))), chunk('IEND', new Uint8Array(0))))
	);
}

/** Parse a real PNG back to RGBA. Only the 8-bit RGBA / non-interlaced case. */
function decodePng(bytes: Uint8Array): { rgba: Uint8ClampedArray; width: number; height: number } {
	const chunks = pngChunks(bytes);
	const ihdr = chunks.find((c) => c.type === 'IHDR')!;
	const view = new DataView(bytes.buffer, bytes.byteOffset);
	const width = view.getUint32(ihdr.dataStart);
	const height = view.getUint32(ihdr.dataStart + 4);
	if (bytes[ihdr.dataStart + 8] !== 8) throw new Error('expected 8-bit depth');
	if (bytes[ihdr.dataStart + 9] !== 6) throw new Error('expected colour type 6 (RGBA)');

	const idat: number[] = [];
	for (const c of chunks) {
		if (c.type !== 'IDAT') continue;
		for (let i = 0; i < c.length; i++) idat.push(bytes[c.dataStart + i]);
	}
	const raw = new Uint8Array(inflateSync(Buffer.from(idat)));

	const stride = width * 4;
	const rgba = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		if (filter !== 0) throw new Error(`unsupported scanline filter ${filter}`);
		rgba.set(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), y * stride);
	}
	return { rgba, width, height };
}

function makeRgba(w: number, h: number, seed: number): Uint8ClampedArray {
	const out = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < w * h; i++) {
		out[i * 4] = (i * 7 + seed) & 0xff;
		out[i * 4 + 1] = (i * 31 + (seed ^ 0x5a)) & 0xff;
		out[i * 4 + 2] = (i * 97 + (seed ^ 0xa5)) & 0xff;
		out[i * 4 + 3] = 0xff;
	}
	return out;
}

// ---------------------------------------------------------------------------

test('a message survives a real PNG encode/decode cycle', () => {
	const w = 120;
	const h = 90;
	const source = makeRgba(w, h, 0x21);
	const secret = 'The eagle lands at 0300. Bring the falcon, and the second photograph.';

	// 1. Embed into decoded pixels, exactly as the workbench does.
	const pixels = new Uint8ClampedArray(source);
	lsbEmbed(pixels, w, h, encoder.encode(secret), false, 1);

	// 2. Re-encode as PNG, which is what the workbench downloads.
	const fileBytes = encodePng(pixels, w, h);

	// 3. Decode the PNG back, which is what the decoder does on a re-opened file.
	const { rgba, width, height } = decodePng(fileBytes);
	assert.equal(width, w);
	assert.equal(height, h);

	// 4. The payload must still be there.
	const out = lsbExtract(rgba, width, height);
	assert.equal(decoder.decode(out.payload), secret);
	assert.equal(out.encrypted, false);
});

test('PNG serialisation is pixel-exact, so the LSB is genuinely lossless', () => {
	// If this ever fails, the "PNG is lossless" claim in the UI is wrong and Method A
	// would be unsafe for that image.
	const w = 64;
	const h = 64;
	const original = makeRgba(w, h, 0x5c);
	const { rgba } = decodePng(encodePng(original, w, h));
	assert.deepEqual([...rgba], [...original]);
});

test('an encrypted message survives the same PNG round trip', async () => {
	const w = 120;
	const h = 90;
	const pixels = new Uint8ClampedArray(makeRgba(w, h, 0x33));
	const secret = 'classified: station key 0x7a4f2b';

	// Few iterations so the test stays fast; production uses 210,000.
	const sealed = await crypto.seal(encoder.encode(secret), 'hunter2', 1_000);
	lsbEmbed(pixels, w, h, sealed, true, 1);

	const { rgba, width, height } = decodePng(encodePng(pixels, w, h));
	const out = lsbExtract(rgba, width, height);
	assert.equal(out.encrypted, true);
	assert.deepEqual(out.payload, sealed);
	assert.equal(decoder.decode(await crypto.unseal(out.payload, 'hunter2')), secret);
});

test('a two-plane message survives the same PNG round trip', () => {
	const w = 120;
	const h = 90;
	const pixels = new Uint8ClampedArray(makeRgba(w, h, 0x7f));
	const secret = 'two planes of cover';
	lsbEmbed(pixels, w, h, encoder.encode(secret), false, 2);

	const { rgba, width, height } = decodePng(encodePng(pixels, w, h));
	const out = lsbExtract(rgba, width, height, 2);
	assert.equal(decoder.decode(out.payload), secret);
	assert.equal(out.twoPlanes, true);
});

test('a PNG carrying a hidden file is still a valid PNG with IEND last', () => {
	const w = 8;
	const h = 8;
	const decoy = encodePng(makeRgba(w, h, 0x01), w, h);

	const hiddenBytes = encoder.encode('PK pretend archive');
	const container = attachTrailer(decoy, buildTrailer('secret.zip', 'application/zip', hiddenBytes));

	// Structure must be intact: the chunk walk still terminates on IEND.
	const chunks = pngChunks(container);
	assert.equal(chunks.at(-1)!.type, 'IEND');
	// A real decoder is unaffected, because it ignores unknown ancillary chunks.
	assert.deepEqual([...decodePng(container).rgba], [...decodePng(decoy).rgba]);
	// Nothing trails the image, so the carver correctly finds nothing.
	assert.equal(imageEofOffset(container), container.length);

	const { hidden, decoy: restored } = detachTrailer(container);
	assert.equal(hidden.name, 'secret.zip');
	assert.deepEqual(hidden.payload, hiddenBytes);
	assert.deepEqual(restored, decoy);
});

test('a PNG with data appended after IEND still renders, and the data is recoverable', () => {
	// This is what other tools produce (`cat a.png b.zip`), and what our fallback path
	// does for a PNG whose chunk structure is unparseable. Decoders ignore it.
	const w = 8;
	const h = 8;
	const decoy = encodePng(makeRgba(w, h, 0x02), w, h);
	const appended = concat(decoy, buildTrailer('notes.txt', 'text/plain', encoder.encode('hi')));
	assert.deepEqual([...decodePng(appended).rgba], [...decodePng(decoy).rgba]);

	// The tail trailer is still found, and the decoy is restored exactly.
	const { hidden, decoy: restored } = detachTrailer(appended);
	assert.equal(hidden.name, 'notes.txt');
	assert.equal(decoder.decode(hidden.payload), 'hi');
	assert.deepEqual(restored, decoy);
});
