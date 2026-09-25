/**
 * Backend resolution: prefer the compiled Rust/WASM core, fall back to TypeScript.
 *
 * Both produce byte-identical containers (`docs/STEGO_FORMAT.md`), so the choice only
 * affects speed, not behaviour. Resolution happens once per worker and is reported to
 * the UI so nobody is confused about which engine ran.
 */

import * as core from './core.ts';
import * as crypto from './crypto.ts';
import { tryLoadWasm } from './wasm.ts';
import { StegError, StegErrorCode, type BackendKind, type StegEngine } from './types.ts';

export const TYPESCRIPT_VERSION = { core: '1.0.0-ts', container: core.CONTAINER_VERSION, kdfIterations: crypto.KDF_ITERATIONS };

/** The always-available engine. No dependencies beyond this module's own imports. */
export function createTypeScriptEngine(): StegEngine {
	/**
	 * The plane count is recorded in the container header, but reading the header needs a
	 * slot order, so a decoder that was not told which layout was used has to try both.
	 * One plane is overwhelmingly the common case, so it goes first.
	 */
	const lsbExtract = (rgba: Uint8ClampedArray, width: number, height: number) => {
		try {
			return core.lsbExtract(rgba, width, height, 1);
		} catch (err) {
			if (err instanceof StegError && err.code === StegErrorCode.NoContainer) {
				return core.lsbExtract(rgba, width, height, 2);
			}
			throw err;
		}
	};

	return {
		backend: 'typescript',

		version: () => ({ ...TYPESCRIPT_VERSION, backend: 'typescript' as const }),

		lsbCapacityBits: core.capacityBits,
		lsbCarrierCount: core.carrierCount,
		lsbEmbed: core.lsbEmbed,
		lsbExtract,

		attach(decoy, name, mime, payload) {
			return core.attachTrailer(decoy, core.buildTrailer(name, mime, payload));
		},
		detach: core.detachTrailer,
		carve: core.carveCandidates,
		imageEofOffset: core.imageEofOffset,

		seal: crypto.seal,
		unseal: crypto.unseal,
		isEnvelope: crypto.isEnvelope
	};
}

let resolved: Promise<StegEngine> | null = null;

/**
 * Resolve the engine once and memoise.
 *
 * A WASM failure is not an error the user needs to see — the TypeScript engine handles
 * every operation identically — so we degrade quietly and report the choice through
 * `version()`.
 */
export function resolveEngine(): Promise<StegEngine> {
	if (!resolved) {
		resolved = tryLoadWasm()
			.then((wasm) => wasm ?? createTypeScriptEngine())
			.catch(() => createTypeScriptEngine());
	}
	return resolved;
}

export type { BackendKind, StegEngine };
