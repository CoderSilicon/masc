/**
 * Shared types for the masc steganography engine.
 *
 * The same shapes are produced by the TypeScript core (`core.ts`) and by the WASM
 * module (`wasm.ts`), so the UI never needs to know which backend is live.
 */

/** Which implementation is doing the work. */
export type BackendKind = 'wasm' | 'typescript';

/** Low bits per channel used for embedding. */
export type Planes = 1 | 2;

/** Result of a successful embed. */
export interface EmbedReport {
	/** Bits occupied by the header + payload. The rest of the carrier space is zero-filled. */
	bitsWritten: number;
	/** Total bits the carrier image can hold. */
	bitsCapacity: number;
	/** Number of fully opaque carrier pixels. */
	carriers: number;
	/** Bytes actually hidden (before encryption). */
	payloadBytes: number;
}

/** Result of a successful extract. */
export interface ExtractReport {
	/** The hidden bytes, still encrypted if `encrypted` is true. */
	payload: Uint8Array;
	/** True when the payload is a `STGECRY1` envelope and needs a passphrase. */
	encrypted: boolean;
	/** True when the payload was written using two LSB planes. */
	twoPlanes: boolean;
	/** Carrier index the container started at. Non-zero means it had to be resynchronised. */
	carrierOffset: number;
}

/** A hidden file recovered from a container. */
export interface HiddenFile {
	name: string;
	mime: string;
	payload: Uint8Array;
	/** Byte offset the trailer was found at. `0` inside a PNG chunk. */
	offset: number;
}

/** Method B extraction result: the hidden file plus the restored decoy. */
export interface DetachResult {
	hidden: HiddenFile;
	/** The container with the hidden payload removed, byte-for-byte the original decoy. */
	decoy: Uint8Array;
}

/** A well-known file signature found past the image's EOF marker. */
export interface CarveCandidate {
	/** Offset from the start of the container file. */
	offset: number;
	/** Short label, e.g. `"ZIP"`. */
	kind: string;
	/** MIME type to save the carved bytes as. */
	mime: string;
	/** Exact byte length when we could determine it, otherwise `null` (carved to EOF). */
	length: number | null;
	suggestedName: string;
	payload: Uint8Array;
}

/**
 * The engine surface consumed by the worker and the UI.
 *
 * `seal`/`unseal` are async even in the WASM backend because the WebCrypto fallback is
 * async; the Rust implementation is synchronous underneath.
 */
export interface StegEngine {
	readonly backend: BackendKind;
	/** Core version, for the parity banner in the UI. */
	version(): { core: string; container: number; kdfIterations: number; backend: BackendKind };

	lsbCapacityBits(rgba: Uint8ClampedArray, width: number, height: number, planes: Planes): number;
	lsbCarrierCount(rgba: Uint8ClampedArray, width: number, height: number): number;
	lsbEmbed(
		rgba: Uint8ClampedArray,
		width: number,
		height: number,
		payload: Uint8Array,
		encrypted: boolean,
		planes: Planes
	): EmbedReport;
	lsbExtract(rgba: Uint8ClampedArray, width: number, height: number): ExtractReport;

	attach(decoy: Uint8Array, name: string, mime: string, payload: Uint8Array): Uint8Array;
	detach(container: Uint8Array): DetachResult;
	carve(container: Uint8Array, searchFrom: number): CarveCandidate[];
	imageEofOffset(bytes: Uint8Array): number;

	seal(plaintext: Uint8Array, passphrase: string): Promise<Uint8Array>;
	unseal(envelope: Uint8Array, passphrase: string): Promise<Uint8Array>;
	isEnvelope(bytes: Uint8Array): boolean;
}

/** Error codes shared by both backends, so the UI can branch on them. */
export const StegErrorCode = {
	Capacity: 'CAPACITY_EXCEEDED',
	NoContainer: 'NO_CONTAINER',
	Malformed: 'MALFORMED',
	Checksum: 'CHECKSUM_MISMATCH',
	BadPassphrase: 'BAD_PASSPHRASE',
	Truncated: 'TRUNCATED',
	Crypto: 'CRYPTO',
	WasmMissing: 'WASM_MISSING'
} as const;

export type StegErrorCode = (typeof StegErrorCode)[keyof typeof StegErrorCode];

/** Error thrown by the engine, carrying a stable `code`. */
export class StegError extends Error {
	readonly code: StegErrorCode;

	constructor(code: StegErrorCode, message: string) {
		super(message);
		this.name = 'StegError';
		this.code = code;
	}
}
