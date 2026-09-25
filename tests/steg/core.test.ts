/**
 * Tests for the TypeScript steganography core.
 *
 * Run with `npm run test:steg` (Node's built-in test runner; no test framework needed).
 *
 * These mirror the golden vectors in `crates/steg-core/tests/format.rs`. The two
 * implementations must agree byte-for-byte, so if you change one, change both, and expect
 * these assertions to move together with the Rust ones.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
	attachTrailer,
	buildTrailer,
	capacityBits,
	carrierCount,
	carveCandidates,
	concat,
	crc32,
	decodeTrailer,
	detachTrailer,
	imageEofOffset,
	lsbEmbed,
	lsbExtract,
	packLsbHeader,
	pngChunk,
	pngChunks,
	pngIendOffset,
	unpackLsbHeader,
	PNG_SIGNATURE,
	TRAILER_MAGIC
} from '../../src/lib/steg/core.ts';
import * as crypto from '../../src/lib/steg/crypto.ts';
import { StegErrorCode } from '../../src/lib/steg/types.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Deterministic RGBA image with every pixel fully opaque. */
function makeRgba(w: number, h: number, seed = 0x11): Uint8ClampedArray {
	const out = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < w * h; i++) {
		out[i * 4] = (i * 7 + seed) & 0xff;
		out[i * 4 + 1] = (i * 31 + (seed ^ 0x5a)) & 0xff;
		out[i * 4 + 2] = (i * 97 + (seed ^ 0xa5)) & 0xff;
		out[i * 4 + 3] = 0xff;
	}
	return out;
}

/** A structurally valid PNG: signature + IHDR + IEND. */
function tinyPng(): Uint8Array {
	return concat(new Uint8Array(PNG_SIGNATURE), concat(pngChunk('IHDR', new Uint8Array(13)), pngChunk('IEND', new Uint8Array(0))));
}

// ---------------------------------------------------------------------------
// CRC-32
// ---------------------------------------------------------------------------

test('crc32 matches the standard check vector', () => {
	assert.equal(crc32(encoder.encode('123456789')), 0xcbf43926);
});

test('crc32 of empty input is zero', () => {
	assert.equal(crc32(new Uint8Array(0)), 0);
});

// ---------------------------------------------------------------------------
// Method A
// ---------------------------------------------------------------------------

test('lsb round-trips a text payload', () => {
	const w = 64;
	const h = 64;
	const rgba = makeRgba(w, h);
	const secret = encoder.encode('Meet me at 0300. Bring the falcon.');

	const report = lsbEmbed(rgba, w, h, secret, false, 1);
	assert.ok(report.bitsWritten > 0);
	assert.ok(report.bitsWritten <= report.bitsCapacity);
	assert.equal(report.carriers, w * h);
	assert.equal(report.payloadBytes, secret.length);

	const out = lsbExtract(rgba, w, h);
	assert.deepEqual(out.payload, secret);
	assert.equal(out.carrierOffset, 0);
	assert.equal(out.encrypted, false);
	assert.equal(out.twoPlanes, false);
});

test('embedding changes at most one bit per RGB channel and never alpha', () => {
	const w = 32;
	const h = 32;
	const original = makeRgba(w, h, 0x22);
	const rgba = new Uint8ClampedArray(original);

	lsbEmbed(rgba, w, h, encoder.encode('x'), false, 1);

	let changed = 0;
	for (let i = 0; i < rgba.length; i++) {
		if (rgba[i] === original[i]) continue;
		// Exactly one bit differs...
		assert.equal(rgba[i] ^ original[i], 1, `byte ${i} changed by more than the LSB`);
		// ...and it is not the alpha channel.
		assert.notEqual(i % 4, 3, `alpha channel at byte ${i} was modified`);
		changed++;
	}
	assert.ok(changed > 0, 'nothing changed, so nothing was embedded');
});

test('capacity is 3 bits per opaque pixel', () => {
	const w = 10;
	const h = 10;
	const rgba = makeRgba(w, h);
	assert.equal(carrierCount(rgba, w, h), 100);
	assert.equal(capacityBits(rgba, w, h, 1), 300);
	assert.equal(capacityBits(rgba, w, h, 2), 600);
});

test('two-plane embedding round-trips and is flagged', () => {
	const w = 64;
	const h = 64;
	const rgba = makeRgba(w, h, 0x44);
	const secret = new Uint8Array(200).fill(0xab);

	lsbEmbed(rgba, w, h, secret, false, 2);
	// A two-plane container needs the two-plane slot order; the header's `two_planes`
	// flag is what tells the engine to try it.
	const out = lsbExtract(rgba, w, h, 2);
	assert.deepEqual(out.payload, secret);
	assert.equal(out.twoPlanes, true);
});

test('a one-plane container is not misread as two-plane', () => {
	const w = 32;
	const h = 32;
	const rgba = makeRgba(w, h, 0x45);
	const secret = encoder.encode('one plane only');
	lsbEmbed(rgba, w, h, secret, false, 1);

	// Reading with the wrong slot order must not silently return garbage.
	assert.throws(() => lsbExtract(rgba, w, h, 2), (err: { code: string }) => {
		assert.ok(
			err.code === StegErrorCode.NoContainer || err.code === StegErrorCode.Checksum,
			`expected a failure, got ${err.code}`
		);
		return true;
	});
});

test('semi-transparent pixels are skipped, and never touched', () => {
	// 32x32 with half the pixels transparent leaves 512 carriers = 1536 bits, which is
	// comfortably more than the 27-byte message needs.
	const w = 32;
	const h = 32;
	const rgba = makeRgba(w, h, 0x33);
	const pristine = makeRgba(w, h, 0x33);
	for (let p = 0; p < w * h; p += 2) rgba[p * 4 + 3] = 0x00;

	assert.equal(carrierCount(rgba, w, h), (w * h) / 2);

	const secret = encoder.encode('only opaque pixels carry me');
	lsbEmbed(rgba, w, h, secret, false, 1);

	// Every transparent pixel must be byte-identical to what it was.
	for (let p = 0; p < w * h; p += 2) {
		for (let c = 0; c < 3; c++) {
			assert.equal(rgba[p * 4 + c], pristine[p * 4 + c], `transparent pixel ${p} was modified`);
		}
	}

	assert.deepEqual(lsbExtract(rgba, w, h).payload, secret);
});

test('oversized payloads are rejected with the capacity code', () => {
	const w = 4;
	const h = 4;
	const rgba = makeRgba(w, h, 0x55);
	try {
		lsbEmbed(rgba, w, h, new Uint8Array(10_000), false, 1);
		assert.fail('expected a throw');
	} catch (err) {
		assert.equal((err as { code: string }).code, StegErrorCode.Capacity);
		assert.match((err as Error).message, /only offers 48 bits/);
	}
});

test('a clean image has no container', () => {
	const w = 32;
	const h = 32;
	try {
		lsbExtract(makeRgba(w, h, 0x77), w, h);
		assert.fail('expected a throw');
	} catch (err) {
		assert.equal((err as { code: string }).code, StegErrorCode.NoContainer);
	}
});

test('corrupted low bits are caught by the CRC, not returned as garbage', () => {
	const w = 32;
	const h = 32;
	const rgba = makeRgba(w, h, 0x66);
	lsbEmbed(rgba, w, h, encoder.encode('do not recompress me'), false, 1);

	// This is what a JPEG round trip or a social platform does to the low bits.
	for (let i = 0; i < rgba.length; i += 4) rgba[i] = (rgba[i] + 3) & 0xff;

	try {
		lsbExtract(rgba, w, h);
		assert.fail('expected a throw');
	} catch (err) {
		const code = (err as { code: string }).code;
		assert.ok(
			code === StegErrorCode.Checksum || code === StegErrorCode.NoContainer,
			`expected a corruption error, got ${code}`
		);
	}
});

test('extraction resynchronises when the container starts at carrier 3', () => {
	// Embed at carrier 0 of a wide image, then shift the pixels right by 3.
	//
	// A single row is used deliberately: the slot order is per-pixel but the carrier
	// sequence is a flat raster scan, so a shift that crossed a row boundary would move
	// the first three carriers of the next row somewhere the shift does not describe and
	// corrupt the payload. One row keeps the shift equivalent to a carrier shift.
	const h = 1;
	const w = 1024;
	const w2 = w + 3;
	const secret = encoder.encode('offset payload');

	const wide = makeRgba(w2, h, 0x88);
	lsbEmbed(wide, w2, h, secret, false, 1);

	// new(p) = old(p - 3) for p >= 3; the first three pixels become filler.
	const shifted = makeRgba(w2, h, 0x99);
	shifted.set(wide.subarray(0, w * 4), 3 * 4);

	const out = lsbExtract(shifted, w2, h);
	assert.equal(decoder.decode(out.payload), 'offset payload');
	assert.equal(out.carrierOffset, 3, 'the decoder must report where it resynchronised');
});

test('unicode and empty-ish payloads survive the round trip', () => {
	const w = 64;
	const h = 64;
	const rgba = makeRgba(w, h, 0x12);
	const secret = encoder.encode('🛰️ Estación — ключ: 42\nline two\ttabbed');
	lsbEmbed(rgba, w, h, secret, false, 1);
	assert.equal(decoder.decode(lsbExtract(rgba, w, h).payload), '🛰️ Estación — ключ: 42\nline two\ttabbed');
});

// ---------------------------------------------------------------------------
// Method B
// ---------------------------------------------------------------------------

test('a PNG trailer lives in a private chunk and IEND stays last', () => {
	const decoy = tinyPng();
	const payload = encoder.encode('the hidden file bytes');
	const trailer = buildTrailer('notes.pdf', 'application/pdf', payload);
	const stego = attachTrailer(decoy, trailer);

	const chunks = pngChunks(stego);
	assert.equal(chunks.at(-1)!.type, 'IEND');
	assert.ok(chunks.some((c) => c.type === 'stEg'), 'no stEg chunk found');
	// IEND is the final 12 bytes, so the image data runs right to the end of the file
	// and there is nothing for the forensic carver to look at.
	assert.equal(imageEofOffset(stego), stego.length);

	const { hidden, decoy: restored } = detachTrailer(stego);
	assert.equal(hidden.name, 'notes.pdf');
	assert.equal(hidden.mime, 'application/pdf');
	assert.deepEqual(hidden.payload, payload);
	assert.deepEqual(restored, decoy, 'the decoy must be restored byte-for-byte');
});

test('a non-PNG trailer is appended after the EOF marker', () => {
	// A JPEG-ish blob ending in the EOI marker.
	const decoy = concat(
		new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
		concat(new Uint8Array(32), new Uint8Array([0xff, 0xd9]))
	);
	assert.equal(imageEofOffset(decoy), decoy.length);

	const payload = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...encoder.encode(' pretend zip')]);
	const stego = attachTrailer(decoy, buildTrailer('secret.zip', 'application/zip', payload));

	// The decoy is untouched, and the trailer starts exactly where the image ended.
	assert.deepEqual(stego.subarray(0, decoy.length), decoy);
	assert.equal(decoder.decode(stego.subarray(decoy.length, decoy.length + 8)), TRAILER_MAGIC);

	const { hidden, decoy: restored } = detachTrailer(stego);
	assert.deepEqual(hidden.payload, payload);
	assert.deepEqual(restored, decoy);
});

test('a clean PNG has no trailer', () => {
	try {
		detachTrailer(tinyPng());
		assert.fail('expected a throw');
	} catch (err) {
		assert.equal((err as { code: string }).code, StegErrorCode.NoContainer);
	}
});

test('a crafted filename cannot escape a directory', () => {
	const t = decodeTrailer(buildTrailer('../../../../etc/passwd', 'text/plain', encoder.encode('x')), 0);
	assert.equal(t.name, 'passwd');
});

test('carving finds a ZIP appended the way `cat` would', () => {
	// A minimal ZIP: local file header, filler, then the End-Of-Central-Directory record.
	const zip = concat(
		new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
		concat(
			new Uint8Array(60),
			concat(new Uint8Array([0x50, 0x4b, 0x05, 0x06]), new Uint8Array(18))
		)
	);
	const png = concat(tinyPng(), zip);

	const eof = pngIendOffset(png)!;
	const found = carveCandidates(png, eof + 12);
	assert.ok(found.some((c) => c.kind === 'ZIP'), 'expected a ZIP candidate');
	assert.equal(found[0].offset, eof + 12);
	assert.equal(found[0].length, 86, 'the exact ZIP size comes from its EOCD record');
	assert.equal(found[0].payload.length, 86);
});

test('carving reports nothing when there is nothing past EOF', () => {
	assert.equal(carveCandidates(tinyPng(), tinyPng().length).length, 0);
});

test('the PNG chunk walker terminates on a corrupt length field', () => {
	const bytes = concat(
		new Uint8Array(PNG_SIGNATURE),
		concat(new Uint8Array([0xff, 0xff, 0xff, 0x7f]), new Uint8Array(20))
	);
	assert.equal(pngIendOffset(bytes), null);
	assert.ok(pngChunks(bytes).length <= 1);
});

// ---------------------------------------------------------------------------
// Golden vectors — these pin the layout shared with crates/steg-core
// ---------------------------------------------------------------------------

test('golden: LSB header bytes', () => {
	const blob = packLsbHeader({ encrypted: false, twoPlanes: true }, encoder.encode('hi'));
	assert.equal(decoder.decode(blob.subarray(0, 8)), 'STEGLSB1');
	assert.equal(blob[8], 1, 'version');
	assert.equal(blob[9], 0b0000_0010, 'two-planes flag only');
	assert.deepEqual([...blob.subarray(10, 12)], [0, 0], 'reserved');
	assert.deepEqual([...blob.subarray(12, 16)], [2, 0, 0, 0], 'payload_len u32 LE');
	// CRC-32/ISO-HDLC of "hi" is 0xD8932AAC, stored little-endian.
	assert.deepEqual([...blob.subarray(16, 20)], [0xac, 0x2a, 0x93, 0xd8]);
	assert.equal(blob.length, 20);
});

test('golden: trailer bytes', () => {
	const t = buildTrailer('a.txt', 'text/plain', new Uint8Array([0x78, 0x79]));
	assert.equal(decoder.decode(t.subarray(0, 8)), 'STEGAPP1');
	assert.deepEqual([...t.subarray(8, 10)], [5, 0], 'name_len');
	assert.deepEqual([...t.subarray(10, 12)], [10, 0], 'mime_len');
	assert.deepEqual([...t.subarray(12, 14)], [0, 0], 'reserved');
	assert.deepEqual([...t.subarray(14, 18)], [2, 0, 0, 0], 'payload_len');
	assert.equal(decoder.decode(t.subarray(18, 23)), 'a.txt');
	assert.equal(decoder.decode(t.subarray(23, 33)), 'text/plain');
	assert.deepEqual([...t.subarray(33)], [0x78, 0x79]);
});

test('header pack/unpack is a round trip', () => {
	const payload = encoder.encode('some payload');
	const header = unpackLsbHeader(packLsbHeader({ encrypted: true, twoPlanes: false }, payload));
	assert.equal(header.flags.encrypted, true);
	assert.equal(header.flags.twoPlanes, false);
	assert.equal(header.payloadLength, payload.length);
	assert.equal(header.payloadCrc32, crc32(payload));
});

test('golden: PNG chunk CRC covers type and data', () => {
	// CRC-32/ISO-HDLC of the bytes "IEND" is 0xAE426082.
	const chunk = pngChunk('IEND', new Uint8Array(0));
	assert.equal(chunk.length, 12);
	assert.deepEqual([...chunk.subarray(0, 4)], [0, 0, 0, 0], 'zero-length data');
	assert.equal(decoder.decode(chunk.subarray(4, 8)), 'IEND');
	assert.deepEqual([...chunk.subarray(8, 12)], [0xae, 0x42, 0x60, 0x82]);
});

// ---------------------------------------------------------------------------
// Encryption
// ---------------------------------------------------------------------------

test('sealed payloads round-trip and are flagged as encrypted', async () => {
	// Use a low iteration count so the test stays fast; the product default is 210,000.
	const plaintext = 'the eagle lands at dawn';
	const sealed = await crypto.seal(encoder.encode(plaintext), 'correct horse', 1_000);
	assert.equal(crypto.isEnvelope(sealed), true);
	assert.equal(decoder.decode(sealed.subarray(0, 8)), 'STGECRY1');
	// 60-byte fixed header + ciphertext + 16-byte GCM tag.
	assert.equal(sealed.length, 60 + plaintext.length + 16);

	const opened = await crypto.unseal(sealed, 'correct horse');
	assert.equal(decoder.decode(opened), plaintext);
});

test('a wrong passphrase is rejected', async () => {
	const sealed = await crypto.seal(encoder.encode('secret'), 'right', 1_000);
	await assert.rejects(() => crypto.unseal(sealed, 'wrong'), (err: { code: string }) => {
		assert.equal(err.code, StegErrorCode.BadPassphrase);
		return true;
	});
});

test('a tampered ciphertext is rejected', async () => {
	const sealed = await crypto.seal(encoder.encode('secret'), 'right', 1_000);
	sealed[sealed.length - 1] ^= 0x01;
	await assert.rejects(() => crypto.unseal(sealed, 'right'), (err: { code: string }) => {
		assert.equal(err.code, StegErrorCode.BadPassphrase);
		return true;
	});
});

test('the salt and IV are unique per seal', async () => {
	const a = await crypto.seal(encoder.encode('same'), 'pw', 1_000);
	const b = await crypto.seal(encoder.encode('same'), 'pw', 1_000);
	assert.notDeepEqual([...a.subarray(11, 43)], [...b.subarray(11, 43)], 'salts must differ');
	assert.notDeepEqual([...a.subarray(44, 56)], [...b.subarray(44, 56)], 'IVs must differ');
	assert.notDeepEqual([...a], [...b], 'identical ciphertexts would be a serious bug');
});

test('an encrypted payload survives the LSB round trip', async () => {
	const w = 64;
	const h = 64;
	const rgba = makeRgba(w, h, 0x33);
	const secret = encoder.encode('classified');
	const sealed = await crypto.seal(secret, 'hunter2', 1_000);

	lsbEmbed(rgba, w, h, sealed, true, 1);
	const out = lsbExtract(rgba, w, h);
	assert.equal(out.encrypted, true, 'the container must record that it is sealed');
	assert.deepEqual(out.payload, sealed);
	assert.equal(decoder.decode(await crypto.unseal(out.payload, 'hunter2')), 'classified');
});

test('isEnvelope rejects non-envelopes', () => {
	assert.equal(crypto.isEnvelope(encoder.encode('short')), false);
	assert.equal(crypto.isEnvelope(encoder.encode('STGECRY1 but then some other bytes')), false);
});
