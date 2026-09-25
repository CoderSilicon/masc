/**
 * Steganography worker.
 *
 * Every bit operation happens here so a 24-megapixel image cannot freeze the UI. The
 * worker owns the engine (`resolveEngine`) and the UI never touches pixel buffers
 * directly.
 *
 * Data flow note: requests are *cloned* rather than transferred, because the main thread
 * still needs the decoded pixels to render a preview. Responses transfer their buffers
 * back, which is where the volume actually is.
 */

/// <reference lib="webworker" />

import { resolveEngine } from './engine.ts';
import { StegError, type CarveCandidate, type StegEngine } from './types.ts';
import type { DetachResult, EmbedReport, ExtractReport, Planes } from './types.ts';

export type StegRequest =
	| { id: number; type: 'init' }
	| { id: number; type: 'lsbCapacity'; rgba: Uint8ClampedArray; width: number; height: number; planes: Planes }
	| {
			id: number;
			type: 'lsbEmbed';
			rgba: Uint8ClampedArray;
			width: number;
			height: number;
			payload: Uint8Array;
			encrypted: boolean;
			planes: Planes;
	  }
	| { id: number; type: 'lsbExtract'; rgba: Uint8ClampedArray; width: number; height: number }
	| { id: number; type: 'attach'; decoy: Uint8Array; name: string; mime: string; payload: Uint8Array }
	| { id: number; type: 'detach'; container: Uint8Array }
	| { id: number; type: 'carve'; container: Uint8Array }
	| { id: number; type: 'seal'; bytes: Uint8Array; passphrase: string }
	| { id: number; type: 'unseal'; bytes: Uint8Array; passphrase: string }
	| { id: number; type: 'isEnvelope'; bytes: Uint8Array };

/**
 * A response. Deliberately carries no `transfer` list: ownership of the result buffers is
 * passed to `postMessage` separately, and duplicating it here would be a way to get the
 * two out of sync.
 */
export type StegResponse =
	| { id: number; ok: true; result: unknown }
	| { id: number; ok: false; error: { message: string; code: string } };

/** Report object returned by the `init` call. */
export interface EngineInfo {
	backend: 'wasm' | 'typescript';
	core: string;
	container: number;
	kdfIterations: number;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let engine: StegEngine | null = null;

async function getEngine(): Promise<StegEngine> {
	if (!engine) engine = await resolveEngine();
	return engine;
}

function reply(response: StegResponse, transfer: ArrayBuffer[] = []) {
	// `postMessage` throws if a buffer appears in both `result` and `transfer`, so the
	// list is always built explicitly and the payload is what we hand over.
	ctx.postMessage(response, transfer);
}

ctx.addEventListener('message', async (event: MessageEvent<StegRequest>) => {
	const req = event.data;
	try {
		const e = await getEngine();

		switch (req.type) {
			case 'init': {
				const v = e.version();
				reply(
					{
						id: req.id,
						ok: true,
						result: {
							backend: v.backend,
							core: v.core,
							container: v.container,
							kdfIterations: v.kdfIterations
						} satisfies EngineInfo
					}
				);
				return;
			}

			case 'lsbCapacity': {
				reply({
					id: req.id,
					ok: true,
					result: e.lsbCapacityBits(req.rgba, req.width, req.height, req.planes)
				});
				return;
			}

			case 'lsbEmbed': {
				// The worker owns this copy, so it can mutate it in place and hand the
				// buffer straight back without a second copy.
				const report: EmbedReport = e.lsbEmbed(
					req.rgba,
					req.width,
					req.height,
					req.payload,
					req.encrypted,
					req.planes
				);
				reply(
					{ id: req.id, ok: true, result: { rgba: req.rgba, report } },
					[req.rgba.buffer as ArrayBuffer]
				);
				return;
			}

			case 'lsbExtract': {
				const report: ExtractReport = e.lsbExtract(req.rgba, req.width, req.height);
				reply({ id: req.id, ok: true, result: report }, [report.payload.buffer as ArrayBuffer]);
				return;
			}

			case 'attach': {
				const out = e.attach(req.decoy, req.name, req.mime, req.payload);
				reply({ id: req.id, ok: true, result: out }, [out.buffer as ArrayBuffer]);
				return;
			}

			case 'detach': {
				const result: DetachResult = e.detach(req.container);
				reply(
					{ id: req.id, ok: true, result },
					[result.hidden.payload.buffer as ArrayBuffer, result.decoy.buffer as ArrayBuffer]
				);
				return;
			}

			case 'carve': {
				// Only look *past* the image's own EOF marker, otherwise every signature
				// inside the decoy itself would show up as a candidate.
				const eof = e.imageEofOffset(req.container);
				const candidates: CarveCandidate[] = e.carve(req.container, eof);
				reply({ id: req.id, ok: true, result: { eof, candidates } });
				return;
			}

			case 'seal': {
				const out = await e.seal(req.bytes, req.passphrase);
				reply({ id: req.id, ok: true, result: out }, [out.buffer as ArrayBuffer]);
				return;
			}

			case 'unseal': {
				const out = await e.unseal(req.bytes, req.passphrase);
				reply({ id: req.id, ok: true, result: out }, [out.buffer as ArrayBuffer]);
				return;
			}

			case 'isEnvelope': {
				reply({ id: req.id, ok: true, result: e.isEnvelope(req.bytes) });
				return;
			}
		}
	} catch (err) {
		const error =
			err instanceof StegError
				? { message: err.message, code: err.code }
				: { message: (err as Error)?.message ?? String(err), code: 'UNKNOWN' };
		reply({ id: req.id, ok: false, error });
	}
});
