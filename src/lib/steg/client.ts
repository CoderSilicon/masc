/**
 * Main-thread client for the steganography worker.
 *
 * Everything pixel-heavy happens in the worker; this file is just a typed RPC wrapper
 * plus a lazy worker singleton. It is the only module the Svelte components import.
 */

import type { CarveCandidate, DetachResult, EmbedReport, ExtractReport, Planes } from './types.ts';
import type { EngineInfo, StegRequest, StegResponse } from './worker.ts';

export type { CarveCandidate, DetachResult, EmbedReport, ExtractReport, Planes };
export type { EngineInfo };

/** Error surfaced to the UI, carrying the engine's stable code. */
export class StegClientError extends Error {
	readonly code: string;
	constructor(code: string, message: string) {
		super(message);
		this.name = 'StegClientError';
		this.code = code;
	}
}

type Pending = { resolve: (value: unknown) => void; reject: (err: StegClientError) => void };

/**
 * `Omit` over a union collapses it to the common keys, which would erase every
 * request-specific field. Distribute it across the members instead.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A request minus the id the transport adds. */
export type StegRequestBody = DistributiveOmit<StegRequest, 'id'>;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
let engineInfoPromise: Promise<EngineInfo> | null = null;

function getWorker(): Worker {
	if (worker) return worker;

	// This module is imported by SSR too, where there is no `Worker` global. Fail with a
	// clear message rather than a bare `ReferenceError`, so callers can skip the call.
	if (typeof Worker === 'undefined') {
		throw new StegClientError(
			'NO_WORKER',
			'the steganography worker is only available in the browser'
		);
	}

	// Vite rewrites this to a bundled worker chunk with its own module graph.
	worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
	worker.addEventListener('message', (event: MessageEvent<StegResponse>) => {
		const res = event.data;
		const entry = pending.get(res.id);
		if (!entry) return;
		pending.delete(res.id);
		if (res.ok) entry.resolve(res.result);
		else entry.reject(new StegClientError(res.error.code, res.error.message));
	});
	worker.addEventListener('error', (event) => {
		// A worker-level failure kills every in-flight request; reject them all so the
		// UI can show an error instead of hanging on a pending promise.
		const message = event.message || 'the steganography worker crashed';
		for (const [, entry] of pending) {
			entry.reject(new StegClientError('WORKER_CRASHED', message));
		}
		pending.clear();
		worker?.terminate();
		worker = null;
		engineInfoPromise = null;
	});
	return worker;
}

function call<T>(req: StegRequestBody, transfer: Transferable[] = []): Promise<T> {
	let w: Worker;
	try {
		w = getWorker();
	} catch (err) {
		return Promise.reject(err);
	}
	const id = nextId++;
	return new Promise<T>((resolve, reject) => {
		pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
		try {
			w.postMessage({ ...req, id } as StegRequest, transfer);
		} catch (err) {
			pending.delete(id);
			reject(new StegClientError('POST_FAILED', (err as Error).message));
		}
	});
}

/** Terminate the worker. Useful on component teardown in dev, where HMR can leak one. */
export function disposeClient() {
	worker?.terminate();
	worker = null;
	engineInfoPromise = null;
	pending.clear();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Report which engine is live. `wasm` means the compiled Rust core; `typescript` means the
 * bundled fallback. Both produce identical containers.
 */
export function engineInfo(): Promise<EngineInfo> {
	if (!engineInfoPromise) {
		engineInfoPromise = call<EngineInfo>({ type: 'init' });
	}
	return engineInfoPromise;
}

/** Bits the image can hold at the given plane count. */
export function capacityBits(
	rgba: Uint8ClampedArray,
	width: number,
	height: number,
	planes: Planes = 1
): Promise<number> {
	return call<number>({ type: 'lsbCapacity', rgba, width, height, planes });
}

/**
 * Embed `payload` into a copy of `rgba`.
 *
 * The caller's buffer is left untouched so the original image can still be shown
 * side-by-side with the result. Copies, because the worker also needs the pixels.
 */
export function embedText(
	rgba: Uint8ClampedArray,
	width: number,
	height: number,
	payload: Uint8Array,
	encrypted: boolean,
	planes: Planes = 1
): Promise<{ rgba: Uint8ClampedArray; report: EmbedReport }> {
	const copy = new Uint8ClampedArray(rgba);
	return call<{ rgba: Uint8ClampedArray; report: EmbedReport }>(
		{ type: 'lsbEmbed', rgba: copy, width, height, payload, encrypted, planes }
	);
}

/** Read a hidden payload out of decoded pixels. */
export function extractText(
	rgba: Uint8ClampedArray,
	width: number,
	height: number
): Promise<ExtractReport> {
	return call<ExtractReport>({ type: 'lsbExtract', rgba, width, height });
}

/** Method B: attach a hidden file to a decoy file. */
export function attachFile(
	decoy: Uint8Array,
	name: string,
	mime: string,
	payload: Uint8Array
): Promise<Uint8Array> {
	const decoyCopy = new Uint8Array(decoy);
	return call<Uint8Array>({ type: 'attach', decoy: decoyCopy, name, mime, payload });
}

/** Method B: recover a hidden file and rebuild the original decoy. */
export function detachFile(container: Uint8Array): Promise<DetachResult> {
	const copy = new Uint8Array(container);
	return call<DetachResult>({ type: 'detach', container: copy });
}

/**
 * Look for known file signatures past the image's EOF marker.
 *
 * This is the recovery path for files produced by other tools (`cat a.jpg b.zip`,
 * `zip -A`, ImageSteg, OpenStego …), not just by our own encoder.
 */
export function carveFile(
	container: Uint8Array
): Promise<{ eof: number; candidates: CarveCandidate[] }> {
	const copy = new Uint8Array(container);
	return call<{ eof: number; candidates: CarveCandidate[] }>({ type: 'carve', container: copy });
}

/** PBKDF2 + AES-256-GCM envelope. */
export function seal(plaintext: Uint8Array, passphrase: string): Promise<Uint8Array> {
	const copy = new Uint8Array(plaintext);
	return call<Uint8Array>({ type: 'seal', bytes: copy, passphrase });
}

/** Open an envelope. Wrong passphrase and tampering both throw `BAD_PASSPHRASE`. */
export function unseal(envelope: Uint8Array, passphrase: string): Promise<Uint8Array> {
	const copy = new Uint8Array(envelope);
	return call<Uint8Array>({ type: 'unseal', bytes: copy, passphrase });
}

/** Cheap `STGECRY1` check. */
export function isEnvelope(bytes: Uint8Array): Promise<boolean> {
	return call<boolean>({ type: 'isEnvelope', bytes });
}
