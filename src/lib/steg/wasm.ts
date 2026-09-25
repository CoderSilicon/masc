/**
 * Adapter that exposes the compiled `steg-core` WASM module as a `StegEngine`.
 *
 * The module is produced by `npm run build:wasm` and lands in `static/wasm/`. It is
 * optional: `engine.ts` falls back to the TypeScript core when the file is missing, so a
 * fresh clone works before anyone touches Rust.
 *
 * The dynamic import uses `@vite-ignore` so a missing `/wasm/steg_core.js` is a runtime
 * 404 we can catch, not a build-time resolution failure.
 */

import { StegError, StegErrorCode, type StegEngine } from './types.ts';

/**
 * `wasm_bindgen` takes `Uint8Array`; the engine interface is `Uint8ClampedArray` because
 * that is what `ImageData.data` gives us. Both views share the same `ArrayBuffer`, so
 * this is a zero-copy reinterpret — writes through the `Uint8Array` are visible in the
 * clamped array and vice versa.
 */
function asU8(rgba: Uint8ClampedArray): Uint8Array {
	return new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.byteLength);
}

/** Where `wasm-pack` output is served from. Matches the `build:wasm` script. */
const WASM_MODULE_URL = '/wasm/steg_core.js';

interface StegCoreWasm {
	default(input?: RequestInfo | URL): Promise<void>;
	lsb_capacity_bits(rgba: Uint8Array, width: number, height: number, planes: number): number;
	lsb_carrier_count(rgba: Uint8Array, width: number, height: number): number;
	lsb_embed(
		rgba: Uint8Array,
		width: number,
		height: number,
		payload: Uint8Array,
		encrypted: boolean,
		planes: number
	): { bitsWritten: number; bitsCapacity: number; carriers: number; payloadBytes: number };
	lsb_extract(
		rgba: Uint8Array,
		width: number,
		height: number
	): { payload: Uint8Array; encrypted: boolean; twoPlanes: boolean; carrierOffset: number };
	seal(plaintext: Uint8Array, passphrase: string): Uint8Array;
	unseal(envelope: Uint8Array, passphrase: string): Uint8Array;
	is_envelope(bytes: Uint8Array): boolean;
	attach(decoy: Uint8Array, name: string, mime: string, payload: Uint8Array): Uint8Array;
	detach(container: Uint8Array): {
		decoy: Uint8Array;
		trailer: { name: string; mime: string; payload: Uint8Array; offset: number };
	};
	carve(
		container: Uint8Array,
		searchFrom: number
	): Array<{
		offset: number;
		kind: string;
		mime: string;
		length: number | null;
		suggestedName: string;
		payload: Uint8Array;
	}>;
	image_eof_offset(bytes: Uint8Array): number;
	kdf_iterations(): number;
	version(): { core: string; container: number; kdfIterations: number; platform: string };
}

/**
 * Try to load the WASM module.
 *
 * @returns the initialised module, or `null` if it has not been built. Callers are
 *   expected to fall back to the TypeScript engine rather than surface an error.
 */
export async function tryLoadWasm(): Promise<StegEngine | null> {
	let wasm: StegCoreWasm;
	try {
		const mod = await import(/* @vite-ignore */ WASM_MODULE_URL);
		wasm = (mod.default ?? mod) as StegCoreWasm;
		await wasm.default();
	} catch (err) {
		if (import.meta.env?.DEV) {
			console.info(
				`[steg] WASM backend unavailable (${(err as Error).message}). ` +
					'Falling back to the TypeScript engine. Run `npm run build:wasm` for the faster path.'
			);
		}
		return null;
	}

	// Sanity check: if the module is present but broken, fail loudly rather than
	// silently returning wrong images.
	try {
		wasm.version();
	} catch {
		return null;
	}

	return {
		backend: 'wasm',

		version() {
			const v = wasm.version();
			return { core: v.core, container: v.container, kdfIterations: v.kdfIterations, backend: 'wasm' as const };
		},

		lsbCapacityBits: (rgba, w, h, planes) => wasm.lsb_capacity_bits(asU8(rgba), w, h, planes),
		lsbCarrierCount: (rgba, w, h) => wasm.lsb_carrier_count(asU8(rgba), w, h),

		lsbEmbed(rgba, w, h, payload, encrypted, planes) {
			// Rust mutates this view in place; it is the same memory the caller holds, so
			// the modified pixels are visible without a copy.
			return wasm.lsb_embed(asU8(rgba), w, h, payload, encrypted, planes);
		},

		lsbExtract: (rgba, w, h) => wasm.lsb_extract(asU8(rgba), w, h),

		attach: (decoy, name, mime, payload) => wasm.attach(decoy, name, mime, payload),
		detach(container) {
			const r = wasm.detach(container);
			return {
				hidden: { name: r.trailer.name, mime: r.trailer.mime, payload: r.trailer.payload, offset: r.trailer.offset },
				decoy: r.decoy
			};
		},
		carve: (container, from) => wasm.carve(container, from),
		imageEofOffset: (bytes) => wasm.image_eof_offset(bytes),

		async seal(plaintext, passphrase) {
			if (!passphrase) {
				throw new StegError(StegErrorCode.Crypto, 'a passphrase is required to encrypt the payload');
			}
			return wasm.seal(plaintext, passphrase);
		},
		async unseal(envelope, passphrase) {
			try {
				return wasm.unseal(envelope, passphrase);
			} catch (err) {
				// Rust returns a JsValue string; normalise it to a StegError.
				throw normaliseWasmError(err);
			}
		},
		isEnvelope: (bytes) => wasm.is_envelope(bytes)
	};
}

/** Turn a `JsValue` thrown out of Rust into a typed error. */
function normaliseWasmError(err: unknown): StegError {
	const message = typeof err === 'string' ? err : ((err as Error)?.message ?? String(err));
	if (/passphrase|re-compressed/i.test(message)) {
		return new StegError(StegErrorCode.BadPassphrase, 'wrong passphrase, or the payload was re-compressed');
	}
	if (/capacity|bits/i.test(message)) return new StegError(StegErrorCode.Capacity, message);
	if (/checksum/i.test(message)) return new StegError(StegErrorCode.Checksum, message);
	if (/no masc container/i.test(message)) return new StegError(StegErrorCode.NoContainer, message);
	return new StegError(StegErrorCode.Malformed, message);
}
