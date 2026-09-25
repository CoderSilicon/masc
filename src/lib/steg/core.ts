/**
 * TypeScript mirror of `crates/steg-core`.
 *
 * This is a byte-for-byte reimplementation of the Rust core and the normative spec in
 * `docs/STEGO_FORMAT.md`. It is the fallback backend when the WASM module has not been
 * built, and it is the reference implementation people can actually read without a Rust
 * toolchain.
 *
 * Deliberately dependency-free and DOM-free so it can run inside a Web Worker and be
 * unit-tested in Node.
 */

import {
	StegError,
	StegErrorCode,
	type CarveCandidate,
	type DetachResult,
	type EmbedReport,
	type ExtractReport,
	type HiddenFile,
	type Planes
} from './types.ts';

// ---------------------------------------------------------------------------
// Constants (docs/STEGO_FORMAT.md §1.2, §3.1)
// ---------------------------------------------------------------------------

export const LSB_MAGIC = 'STEGLSB1';
export const TRAILER_MAGIC = 'STEGAPP1';
export const ENVELOPE_MAGIC = 'STGECRY1';
export const CONTAINER_VERSION = 1;

/** magic(8) + version(1) + flags(1) + reserved(2) + payload_len(4) + crc32(4) */
export const LSB_HEADER_LEN = 20;

/** magic(8) + iter(2) + salt_len(1) + salt(32) + iv_len(1) + iv(12) + ct_len(4) */
export const ENVELOPE_HEADER_LEN = 60;

const FLAG_ENCRYPTED = 0b0000_0001;
const FLAG_TWO_PLANES = 0b0000_0010;

/** How many carrier pixels to advance while hunting for the magic. */
export const DEFAULT_MAX_SCAN = 65_536;

/** PNG file signature. */
export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Private ancillary chunk that carries a trailer inside a PNG.
 * `s` lowercase => ancillary, `t` lowercase => private, `E` uppercase => reserved bit
 * clear (valid), `g` lowercase => safe to copy.
 */
export const PNG_TRAILER_CHUNK = 'stEg';

const NAME_MAX = 1024;
const MIME_MAX = 255;
/** Refuse absurd length fields before allocating. */
const MAX_PAYLOAD = 1 << 30;

// ---------------------------------------------------------------------------
// CRC-32/ISO-HDLC
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		// Polynomial 0xEDB88320 (reversed 0x04C11DB7).
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c >>> 0;
	}
	return table;
})();

/** CRC-32 of a byte range. Matches `crc32fast` in the Rust build. */
export function crc32(bytes: Uint8Array, start = 0, end = bytes.length): number {
	let c = 0xffffffff;
	for (let i = start; i < end; i++) {
		c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// Small byte helpers
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false });

/** Byte offset of the first index where `needle` occurs, or -1. */
export function indexOfBytes(hay: Uint8Array, needle: Uint8Array, from = 0): number {
	if (needle.length === 0) return Math.min(from, hay.length);
	const last = hay.length - needle.length;
	for (let i = Math.max(0, from); i <= last; i++) {
		// The first-byte test short-circuits, so this stays effectively linear on real
		// files even though the inner loop is naive.
		if (hay[i] !== needle[0]) continue;
		let ok = true;
		for (let k = 1; k < needle.length; k++) {
			if (hay[i + k] !== needle[k]) {
				ok = false;
				break;
			}
		}
		if (ok) return i;
	}
	return -1;
}

/** Last index of `needle`, or -1. */
export function lastIndexOfBytes(hay: Uint8Array, needle: Uint8Array): number {
	if (needle.length === 0) return hay.length;
	for (let i = hay.length - needle.length; i >= 0; i--) {
		if (hay[i] !== needle[0]) continue;
		let ok = true;
		for (let k = 1; k < needle.length; k++) {
			if (hay[i + k] !== needle[k]) {
				ok = false;
				break;
			}
		}
		if (ok) return i;
	}
	return -1;
}

function u16le(v: number): [number, number] {
	return [v & 0xff, (v >>> 8) & 0xff];
}

function u32le(v: number): [number, number, number, number] {
	return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
}

function readU32le(b: Uint8Array, at: number): number {
	return (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;
}

function readU16le(b: Uint8Array, at: number): number {
	return b[at] | (b[at + 1] << 8);
}

/** Join two byte ranges into a new array. */
export function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
	const out = new Uint8Array(a.length + b.length);
	out.set(a, 0);
	out.set(b, a.length);
	return out;
}

// ---------------------------------------------------------------------------
// LSB header
// ---------------------------------------------------------------------------

export interface LsbFlags {
	encrypted: boolean;
	twoPlanes: boolean;
}

/** Serialise the 20-byte LSB header that precedes the payload. */
export function packLsbHeader(flags: LsbFlags, payload: Uint8Array): Uint8Array {
	const out = new Uint8Array(LSB_HEADER_LEN);
	const magic = encoder.encode(LSB_MAGIC);
	out.set(magic, 0);
	out[8] = CONTAINER_VERSION;
	out[9] = (flags.encrypted ? FLAG_ENCRYPTED : 0) | (flags.twoPlanes ? FLAG_TWO_PLANES : 0);
	// out[10..12] stay 0 (reserved)
	out.set(u32le(payload.length), 12);
	out.set(u32le(crc32(payload)), 16);
	return out;
}

export interface LsbHeader {
	flags: LsbFlags;
	payloadLength: number;
	payloadCrc32: number;
}

/** Parse a 20-byte LSB header from the front of `buf`. */
export function unpackLsbHeader(buf: Uint8Array): LsbHeader {
	if (buf.length < LSB_HEADER_LEN) throw new StegError(StegErrorCode.Truncated, 'Unexpected end of input');
	if (decoder.decode(buf.subarray(0, 8)) !== LSB_MAGIC) {
		throw new StegError(StegErrorCode.NoContainer, 'no masc container found in these bytes');
	}
	if (buf[8] !== CONTAINER_VERSION) {
		throw new StegError(
			StegErrorCode.Malformed,
			`unsupported container version ${buf[8]}`
		);
	}
	return {
		flags: { encrypted: !!(buf[9] & FLAG_ENCRYPTED), twoPlanes: !!(buf[9] & FLAG_TWO_PLANES) },
		payloadLength: readU32le(buf, 12),
		payloadCrc32: readU32le(buf, 16)
	};
}

// ---------------------------------------------------------------------------
// The carrier stream
// ---------------------------------------------------------------------------

/**
 * Where the low bits of an image live, and the order they are read in.
 *
 * The slot order is `R.0, G.0, B.0, R.1, G.1, B.1, …` per carrier pixel, so a two-plane
 * image uses neighbouring bits of the same channel. This ordering is the contract
 * between the encoder and the decoder — change it and you must bump `CONTAINER_VERSION`.
 */
class CarrierStream {
	readonly pixels: number;
	readonly planes: number;
	readonly skipTransparent: boolean;
	readonly slots: number;
	/**
	 * The pixel buffer. For decode this is the image as-is; for encode it is the same
	 * buffer we are writing into, so one class serves both directions.
	 */
	readonly data: Uint8ClampedArray;
	private pixel = 0;
	private step = 0;

	constructor(data: Uint8ClampedArray, width: number, height: number, planes: Planes) {
		this.data = data;
		this.pixels = width * height;
		this.planes = planes;
		this.skipTransparent = true;
		this.slots = 3 * planes;
	}

	isCarrier(p: number): boolean {
		return this.data[p * 4 + 3] === 0xff;
	}

	/** Next slot as `[byteIndex, bitIndex]`, or `null` when the image is exhausted. */
	nextSlot(): [number, number] | null {
		while (this.pixel < this.pixels) {
			const p = this.pixel;
			if (!this.isCarrier(p)) {
				this.pixel++;
				this.step = 0;
				continue;
			}
			const plane = (this.step / 3) | 0;
			const channel = this.step % 3;
			this.step++;
			if (this.step === this.slots) {
				this.step = 0;
				this.pixel++;
			}
			if (plane < 8) {
				// R, G, B are byte offsets 0, 1, 2 of the pixel. Offset 3 is alpha and
				// is never used as a carrier.
				return [p * 4 + channel, plane];
			}
		}
		return null;
	}

	/** Bookmark so the magic can be probed without consuming slots. */
	mark(): [number, number] {
		return [this.pixel, this.step];
	}

	reset(to: [number, number]) {
		this.pixel = to[0];
		this.step = to[1];
	}

	/**
	 * Move to the first slot of the *next* carrier pixel.
	 *
	 * Assumes the cursor is parked at a carrier start — which is where a non-destructive
	 * probe leaves it — so it always skips at least one pixel, even when `step` is 0.
	 */
	advanceOneCarrier(): boolean {
		this.pixel++;
		this.step = 0;
		while (this.pixel < this.pixels) {
			if (this.isCarrier(this.pixel)) return true;
			this.pixel++;
		}
		return false;
	}

	/** Number of fully opaque carrier pixels. */
	count(): number {
		if (!this.skipTransparent) return this.pixels;
		let n = 0;
		for (let p = 0; p < this.pixels; p++) if (this.data[p * 4 + 3] === 0xff) n++;
		return n;
	}
}

/** Number of fully opaque carrier pixels in an image. */
export function carrierCount(rgba: Uint8ClampedArray, width: number, height: number): number {
	return new CarrierStream(rgba, width, height, 1).count();
}

/** Bits the image can hold under the given plane count. */
export function capacityBits(
	rgba: Uint8ClampedArray,
	width: number,
	height: number,
	planes: Planes
): number {
	return new CarrierStream(rgba, width, height, planes).count() * 3 * planes;
}

// ---------------------------------------------------------------------------
// Method A — LSB
// ---------------------------------------------------------------------------

/**
 * Write `payload` into the low bits of `rgba`, which is mutated in place.
 *
 * The container is `[20-byte header][payload][zero fill]`, MSB-first, so the length
 * prefix terminates the message and the magic + CRC let the decoder find and validate
 * it.
 */
export function lsbEmbed(
	rgba: Uint8ClampedArray,
	width: number,
	height: number,
	payload: Uint8Array,
	encrypted: boolean,
	planes: Planes
): EmbedReport {
	assertDimensions(rgba, width, height);

	const blob = concat(packLsbHeader({ encrypted, twoPlanes: planes === 2 }, payload), payload);
	const totalBits = blob.length * 8;

	const probe = new CarrierStream(rgba, width, height, planes);
	const carriers = probe.count();
	const capacity = carriers * 3 * planes;
	if (totalBits > capacity) {
		throw new StegError(
			StegErrorCode.Capacity,
			`payload needs ${totalBits} bits but the image only offers ${capacity} bits`
		);
	}

	const stream = new CarrierStream(rgba, width, height, planes);

	// --- Encode the blob, 8 slots per byte, MSB first. ---
	for (const byte of blob) {
		for (let i = 7; i >= 0; i--) {
			const slot = stream.nextSlot();
			if (!slot) break;
			const [idx, plane] = slot;
			const mask = 1 << plane;
			// Clear the bit, then set it to the payload bit. Every other bit of the
			// channel is left alone, which is what keeps the change invisible.
			rgba[idx] = (rgba[idx] & ~mask) | (((byte >> i) & 1) << plane);
		}
	}

	// --- Zero-fill the rest of the carrier space. ---
	// Keeps the stream deterministic and stops the tail of the original image from
	// leaking past the payload.
	for (let slot = stream.nextSlot(); slot !== null; slot = stream.nextSlot()) {
		rgba[slot[0]] &= ~(1 << slot[1]);
	}

	return { bitsWritten: totalBits, bitsCapacity: capacity, carriers, payloadBytes: payload.length };
}

/**
 * Read the LSB payload back out of `rgba`, resynchronising on the magic if needed.
 *
 * `planes` must match what the encoder used. A two-plane container cannot be read with
 * the one-plane slot order (and vice versa), so callers that do not track the plane count
 * should try 1 and then 2 — see `lsbExtractAny` in `engine.ts`.
 */
export function lsbExtract(
	rgba: Uint8ClampedArray,
	width: number,
	height: number,
	planes: Planes = 1
): ExtractReport {
	assertDimensions(rgba, width, height);

	const stream = new CarrierStream(rgba, width, height, planes);

	/**
	 * Read `count` bytes MSB-first from the stream's current position.
	 * Returns `null` if the image runs out of slots mid-read.
	 */
	const readBytes = (count: number): Uint8Array | null => {
		const out = new Uint8Array(count);
		for (let i = 0; i < count; i++) {
			let byte = 0;
			for (let k = 0; k < 8; k++) {
				const slot = stream.nextSlot();
				if (!slot) return null;
				byte = (byte << 1) | ((rgba[slot[0]] >> slot[1]) & 1);
			}
			out[i] = byte;
		}
		return out;
	};

	/** Read `count` bytes without advancing the stream. */
	const peekBytes = (count: number): Uint8Array | null => {
		const at = stream.mark();
		const bytes = readBytes(count);
		stream.reset(at);
		return bytes;
	};

	const magic = encoder.encode(LSB_MAGIC);

	for (let carrierOffset = 0; carrierOffset < DEFAULT_MAX_SCAN; carrierOffset++) {
		if (carrierOffset > 0 && !stream.advanceOneCarrier()) break;

		// --- Probe the 8-byte magic without consuming any slots. ---
		const probe = peekBytes(8);
		if (!probe || !bytesEqual(probe, magic)) continue;

		// --- Magic confirmed: read the 20-byte header, then the payload. ---
		const headerBytes = readBytes(LSB_HEADER_LEN);
		if (!headerBytes) throw new StegError(StegErrorCode.Truncated, 'Unexpected end of input');
		const { flags, payloadLength, payloadCrc32: expectedCrc } = unpackLsbHeader(headerBytes);

		// 1 GiB is far beyond any plausible text message, and stops a corrupted length
		// field from triggering a giant allocation.
		if (payloadLength === 0 || payloadLength > MAX_PAYLOAD) {
			throw new StegError(
				StegErrorCode.Malformed,
				`implausible payload length ${payloadLength}`
			);
		}

		const payload = readBytes(payloadLength);
		if (!payload) throw new StegError(StegErrorCode.Truncated, 'Unexpected end of input');

		const actualCrc = crc32(payload);
		if (actualCrc !== expectedCrc) {
			throw new StegError(
				StegErrorCode.Checksum,
				`checksum mismatch: header says 0x${expectedCrc.toString(16).padStart(8, '0')}, ` +
					`payload hashes to 0x${actualCrc.toString(16).padStart(8, '0')}`
			);
		}

		return { payload, encrypted: flags.encrypted, twoPlanes: flags.twoPlanes, carrierOffset };
	}

	throw new StegError(StegErrorCode.NoContainer, 'no masc container found in these bytes');
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
}

function assertDimensions(rgba: Uint8ClampedArray, width: number, height: number) {
	const need = width * height * 4;
	if (rgba.length < need) {
		throw new StegError(
			StegErrorCode.Malformed,
			`expected ${need} RGBA bytes for ${width}x${height}, got ${rgba.length}`
		);
	}
}

// ---------------------------------------------------------------------------
// PNG chunk plumbing
// ---------------------------------------------------------------------------

export function isPng(bytes: Uint8Array): boolean {
	if (bytes.length < 8) return false;
	for (let i = 0; i < 8; i++) if (bytes[i] !== PNG_SIGNATURE[i]) return false;
	return true;
}

export interface PngChunkRef {
	/** Offset of the chunk's 4-byte length field. */
	start: number;
	/** 4-byte chunk type. */
	type: string;
	/** Offset of the chunk's data. */
	dataStart: number;
	/** Data length. */
	length: number;
}

/**
 * Walk a PNG's chunk list.
 *
 * Uses the declared chunk length to step from chunk to chunk, so chunk *data* can never
 * be mistaken for a header — and so a corrupt file terminates instead of looping.
 */
export function pngChunks(bytes: Uint8Array): PngChunkRef[] {
	const out: PngChunkRef[] = [];
	if (!isPng(bytes)) return out;
	let pos = 8;
	while (pos + 8 <= bytes.length) {
		// Chunk lengths are big-endian on the wire.
		const length =
			((bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]) >>> 0;
		const type = decoder.decode(bytes.subarray(pos + 4, pos + 8));
		out.push({ start: pos, type, dataStart: pos + 8, length });
		const next = pos + 12 + length;
		if (next > bytes.length) break;
		pos = next;
	}
	return out;
}

/** Serialise `data` as a PNG chunk: length + type + data + CRC-32. */
export function pngChunk(type: string, data: Uint8Array): Uint8Array {
	const out = new Uint8Array(12 + data.length);
	// Both the length and the CRC are big-endian on the wire. Getting this wrong still
	// round-trips through our own parser (which trusts the declared length) but produces
	// a chunk that every real PNG validator rejects.
	const be = [
		(data.length >>> 24) & 0xff,
		(data.length >>> 16) & 0xff,
		(data.length >>> 8) & 0xff,
		data.length & 0xff
	];
	out.set(be, 0);
	for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
	out.set(data, 8);
	// The chunk CRC covers the type and the data, but not the length field.
	const crc = crc32(out.subarray(4, 8 + data.length));
	out[8 + data.length] = (crc >>> 24) & 0xff;
	out[9 + data.length] = (crc >>> 16) & 0xff;
	out[10 + data.length] = (crc >>> 8) & 0xff;
	out[11 + data.length] = crc & 0xff;
	return out;
}

/** Offset of the `IEND` chunk's length field, or `null` for a malformed PNG. */
export function pngIendOffset(bytes: Uint8Array): number | null {
	for (const chunk of pngChunks(bytes)) {
		if (chunk.type === 'IEND') return chunk.start;
	}
	return null;
}

// ---------------------------------------------------------------------------
// Method B — trailer
// ---------------------------------------------------------------------------

/**
 * Wrap a hidden file in a `STEGAPP1` trailer.
 *
 * The filename is stripped of path separators so a crafted name cannot escape the
 * browser's download directory.
 */
export function buildTrailer(name: string, mime: string, payload: Uint8Array): Uint8Array {
	if (name.length > NAME_MAX) {
		throw new StegError(StegErrorCode.Malformed, `filename too long (${name.length} bytes)`);
	}
	if (mime.length > MIME_MAX) {
		throw new StegError(StegErrorCode.Malformed, 'MIME type too long');
	}
	if (payload.length > 0xffffffff) {
		throw new StegError(StegErrorCode.Malformed, 'payload larger than 4 GiB');
	}
	const safeName = name.split(/[/\\]/).pop() || 'payload.bin';
	const nameBytes = encoder.encode(safeName);
	const mimeBytes = encoder.encode(mime);

	const out = new Uint8Array(18 + nameBytes.length + mimeBytes.length + payload.length);
	out.set(encoder.encode(TRAILER_MAGIC), 0);
	out.set(u16le(nameBytes.length), 8);
	out.set(u16le(mimeBytes.length), 10);
	out.set(u16le(0), 12); // reserved
	out.set(u32le(payload.length), 14);
	out.set(nameBytes, 18);
	out.set(mimeBytes, 18 + nameBytes.length);
	out.set(payload, 18 + nameBytes.length + mimeBytes.length);
	return out;
}

/** Parse a trailer that starts exactly at `offset`. */
export function decodeTrailer(bytes: Uint8Array, offset: number): HiddenFile {
	if (offset + 18 > bytes.length) {
		throw new StegError(StegErrorCode.Truncated, 'Unexpected end of input');
	}
	if (decoder.decode(bytes.subarray(offset, offset + 8)) !== TRAILER_MAGIC) {
		throw new StegError(StegErrorCode.NoContainer, 'no masc container found in these bytes');
	}
	const nameLength = readU16le(bytes, offset + 8);
	const mimeLength = readU16le(bytes, offset + 10);
	const payloadLength = readU32le(bytes, offset + 14);

	if (nameLength > NAME_MAX || mimeLength > MIME_MAX) {
		throw new StegError(StegErrorCode.Malformed, 'trailer metadata length out of range');
	}
	const metaEnd = offset + 18 + nameLength + mimeLength;
	const end = metaEnd + payloadLength;
	if (end > bytes.length) {
		throw new StegError(StegErrorCode.Truncated, 'Unexpected end of input');
	}

	return {
		name: decoder.decode(bytes.subarray(offset + 18, offset + 18 + nameLength)),
		mime: decoder.decode(bytes.subarray(offset + 18 + nameLength, metaEnd)),
		payload: bytes.slice(metaEnd, end),
		offset
	};
}

/**
 * Build the stego'd container.
 *
 * A PNG decoy gets the trailer in a private ancillary chunk just before `IEND`, because
 * the spec requires `IEND` to be last and a plain append would make the file invalid.
 * Everything else gets a straight tail append, which every decoder ignores.
 */
export function attachTrailer(decoy: Uint8Array, trailer: Uint8Array): Uint8Array {
	if (isPng(decoy)) {
		const iend = pngIendOffset(decoy);
		if (iend !== null) {
			const chunk = pngChunk(PNG_TRAILER_CHUNK, trailer);
			const out = new Uint8Array(decoy.length + chunk.length);
			out.set(decoy.subarray(0, iend), 0);
			out.set(chunk, iend);
			out.set(decoy.subarray(iend), iend + chunk.length);
			return out;
		}
		// Malformed PNG: fall through to a tail append. It still extracts correctly, it
		// just loses the "valid PNG" guarantee.
	}
	return concat(decoy, trailer);
}

/** Recover the hidden file, and rebuild the original decoy. */
export function detachTrailer(container: Uint8Array): DetachResult {
	// 1. PNG private chunk — what `attachTrailer` produces.
	if (isPng(container)) {
		for (const chunk of pngChunks(container)) {
			if (chunk.type !== PNG_TRAILER_CHUNK) continue;
			const dataEnd = chunk.dataStart + chunk.length;
			const hidden = decodeTrailer(container, chunk.dataStart);
			const out = new Uint8Array(container.length - chunk.length - 12);
			out.set(container.subarray(0, chunk.start), 0);
			out.set(container.subarray(dataEnd + 4), chunk.start); // +4 skips the chunk CRC
			return { hidden, decoy: out };
		}
	}

	// 2. Plain tail append — the generic case, and what most third-party tools produce.
	const offset = lastIndexOfBytes(container, encoder.encode(TRAILER_MAGIC));
	if (offset >= 0) {
		const hidden = decodeTrailer(container, offset);
		return { hidden, decoy: container.slice(0, offset) };
	}

	throw new StegError(StegErrorCode.NoContainer, 'no masc container found in these bytes');
}

// ---------------------------------------------------------------------------
// Forensic carving
// ---------------------------------------------------------------------------

const SIGNATURES: Array<[number[] | string, string, string]> = [
	[[0x50, 0x4b, 0x03, 0x04], 'ZIP', 'application/zip'],
	[[0x50, 0x4b, 0x05, 0x06], 'ZIP', 'application/zip'],
	[[0x50, 0x4b, 0x07, 0x08], 'ZIP', 'application/zip'],
	['%PDF-', 'PDF', 'application/pdf'],
	[PNG_SIGNATURE, 'PNG', 'image/png'],
	[[0xff, 0xd8, 0xff], 'JPEG', 'image/jpeg'],
	['GIF8', 'GIF', 'image/gif'],
	['RIFF', 'RIFF', 'application/octet-stream'],
	[[0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], 'RAR', 'application/vnd.rar'],
	[[0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], '7Z', 'application/x-7z-compressed'],
	[[0x1f, 0x8b, 0x08], 'GZIP', 'application/gzip'],
	['BZh', 'BZIP2', 'application/x-bzip2'],
	[[0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00], 'XZ', 'application/x-xz'],
	['OggS', 'OGG', 'application/ogg'],
	['SQLite format 3\0', 'SQLITE', 'application/vnd.sqlite3'],
	[[0x7f, 0x45, 0x4c, 0x46], 'ELF', 'application/x-elf'],
	['MZ', 'EXE', 'application/vnd.microsoft.portable-executable'],
	['ID3', 'MP3', 'audio/mpeg']
];

/** Signature table also matches `ftyp` and `ustar` at fixed offsets — see `carve`. */
const TAGGED: Array<[string, number, string, string]> = [
	['ftyp', 4, 'MP4', 'video/mp4'],
	['ustar', 257, 'TAR', 'application/x-tar']
];

/**
 * Look for well-known file signatures at or after `searchFrom`.
 *
 * This is the "there is no masc trailer but something is clearly tacked on" path. It
 * lets the tool carve payloads out of files produced by `cat a.jpg b.zip`, `zip -A`,
 * ImageSteg, OpenStego and friends, not only by our own encoder.
 */
export function carveCandidates(container: Uint8Array, searchFrom: number): CarveCandidate[] {
	const start = Math.min(searchFrom, container.length);
	const found: CarveCandidate[] = [];

	const push = (offset: number, kind: string, mime: string, length: number | null) => {
		if (found.some((c) => c.offset === offset)) return;
		found.push({
			offset,
			kind,
			mime,
			length,
			suggestedName: `carved_${offset.toString(16).padStart(8, '0')}.${kind.toLowerCase()}`,
			payload: container.slice(offset, length === null ? container.length : offset + length)
		});
	};

	for (const [sig, kind, mime] of SIGNATURES) {
		const needle = typeof sig === 'string' ? encoder.encode(sig) : new Uint8Array(sig);
		let pos = start;
		for (;;) {
			const at = indexOfBytes(container, needle, pos);
			if (at < 0) break;
			// ZIP's exact size comes from its End-Of-Central-Directory record.
			push(at, kind, mime, kind === 'ZIP' ? zipLength(container, at) : null);
			pos = at + 1;
			if (pos >= container.length) break;
		}
	}

	// These need the magic at a *fixed* distance from the real file start, otherwise a
	// stray `ftyp` in arbitrary data produces a false positive.
	for (const [tag, tagOffset, kind, mime] of TAGGED) {
		const needle = encoder.encode(tag);
		let pos = start;
		for (;;) {
			const at = indexOfBytes(container, needle, pos);
			if (at < 0) break;
			if (at >= tagOffset) push(at - tagOffset, kind, mime, null);
			pos = at + 1;
			if (pos >= container.length) break;
		}
	}

	// WEBP is a RIFF container whose form type sits at offset 8.
	let pos = start;
	for (;;) {
		const at = indexOfBytes(container, encoder.encode('RIFF'), pos);
		if (at < 0) break;
		if (
			at + 12 <= container.length &&
			decoder.decode(container.subarray(at + 8, at + 12)) === 'WEBP'
		) {
			push(at, 'WEBP', 'image/webp', null);
		}
		pos = at + 1;
		if (pos >= container.length) break;
	}

	return found.sort((a, b) => a.offset - b.offset);
}

/** Exact byte length of a ZIP archive, resolved via its EOCD record. */
function zipLength(container: Uint8Array, offset: number): number | null {
	const searchStart = offset + 22;
	if (container.length <= searchStart) return null;
	// The EOCD is at most 22 bytes plus a 64 KiB comment.
	const hay = container.subarray(searchStart);
	for (let i = hay.length - 22; i >= 0; i--) {
		if (hay[i] !== 0x50 || hay[i + 1] !== 0x4b || hay[i + 2] !== 0x05 || hay[i + 3] !== 0x06) {
			continue;
		}
		const commentLength = readU16le(hay, i + 20);
		const end = i + 22 + commentLength;
		return end <= hay.length ? searchStart + end - offset : null;
	}
	return null;
}

/**
 * Where the image payload really ends — the first byte available to hide data in.
 * PNG: just past the `IEND` chunk. JPEG: just past the final `FF D9` EOI marker.
 */
export function imageEofOffset(bytes: Uint8Array): number {
	if (isPng(bytes)) {
		const iend = pngIendOffset(bytes);
		if (iend !== null) {
			const be =
				((bytes[iend] << 24) | (bytes[iend + 1] << 16) | (bytes[iend + 2] << 8) | bytes[iend + 3]) >>> 0;
			return Math.min(iend + 12 + be, bytes.length);
		}
		return bytes.length;
	}
	for (let i = bytes.length - 2; i >= 0; i--) {
		if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) return i + 2;
	}
	return bytes.length;
}
