/**
 * Optional confidentiality layer: PBKDF2-HMAC-SHA256 + AES-256-GCM, on WebCrypto.
 *
 * **Steganography hides data, it does not protect it.** Anyone who can run the decoder
 * reads whatever was embedded. When the user supplies a passphrase the payload is sealed
 * into an authenticated envelope first, so the carrier is worthless on its own.
 *
 * Byte-compatible with `crates/steg-core/src/crypto.rs`; see
 * `docs/STEGO_FORMAT.md` §2 for the layout.
 */

import { ENVELOPE_HEADER_LEN, ENVELOPE_MAGIC, indexOfBytes } from './core.ts';
import { StegError, StegErrorCode } from './types.ts';

/** PBKDF2 rounds. Matches `KDF_ITERATIONS` in the Rust core. */
export const KDF_ITERATIONS = 210_000;

const SALT_LEN = 32;
const IV_LEN = 12;

const encoder = new TextEncoder();

/**
 * Additional authenticated data. Binding the envelope to a format version stops a valid
 * envelope from being transplanted into a future container version.
 */
const AAD = encoder.encode('masc-steg-v1');

/**
 * TypeScript 5.7 made typed arrays generic over their backing buffer, and the DOM lib
 * types `BufferSource` as `ArrayBufferView<ArrayBuffer>`. Every array we hand WebCrypto
 * is created here or in our own engine, so it is always `ArrayBuffer`-backed; this
 * narrows the type without changing behaviour.
 */
function src(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
	return bytes as Uint8Array<ArrayBuffer>;
}

/** True when `crypto.subtle` is usable — requires a secure context (HTTPS or localhost). */
export function cryptoAvailable(): boolean {
	return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

function requireCrypto(): SubtleCrypto {
	if (!cryptoAvailable()) {
		throw new StegError(
			StegErrorCode.Crypto,
			'WebCrypto is unavailable. The passphrase layer needs a secure context (https:// or localhost).'
		);
	}
	return crypto.subtle;
}

/**
 * Seal `plaintext` into a `STGECRY1` envelope.
 *
 * Salt and IV come from the platform CSPRNG, never from `Math.random()`.
 */
export async function seal(
	plaintext: Uint8Array,
	passphrase: string,
	iterations: number = KDF_ITERATIONS
): Promise<Uint8Array> {
	const subtle = requireCrypto();
	if (!passphrase) {
		throw new StegError(StegErrorCode.Crypto, 'a passphrase is required to encrypt the payload');
	}

	const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
	const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));

	const key = await deriveKey(passphrase, salt, iterations);
	const ciphertext = new Uint8Array(
		await subtle.encrypt(
			{ name: 'AES-GCM', iv: src(iv), additionalData: AAD, tagLength: 128 },
			key,
			src(plaintext)
		)
	);

	const out = new Uint8Array(ENVELOPE_HEADER_LEN + ciphertext.length);
	out.set(encoder.encode(ENVELOPE_MAGIC), 0);
	new DataView(out.buffer).setUint16(8, iterations, true);
	out[10] = SALT_LEN;
	out.set(salt, 11);
	out[43] = IV_LEN;
	out.set(iv, 44);
	new DataView(out.buffer).setUint32(56, ciphertext.length, true);
	out.set(ciphertext, ENVELOPE_HEADER_LEN);
	return out;
}

/**
 * Open a `STGECRY1` envelope.
 *
 * A wrong passphrase and a tampered payload both throw `BAD_PASSPHRASE`. GCM genuinely
 * cannot tell them apart, and reporting which one it was would hand an attacker an
 * oracle.
 */
export async function unseal(envelope: Uint8Array, passphrase: string): Promise<Uint8Array> {
	const subtle = requireCrypto();
	if (!isEnvelope(envelope)) {
		throw new StegError(StegErrorCode.Malformed, 'not a STGECRY1 envelope');
	}

	const view = new DataView(envelope.buffer, envelope.byteOffset, envelope.byteLength);
	const iterations = view.getUint16(8, true);
	if (iterations === 0) {
		throw new StegError(StegErrorCode.Malformed, 'envelope declares 0 PBKDF2 iterations');
	}

	const saltLen = envelope[10];
	if (saltLen === 0 || saltLen > 64) {
		throw new StegError(StegErrorCode.Malformed, `bad salt length ${saltLen}`);
	}
	const ivAt = 11 + saltLen;
	if (ivAt + 1 > envelope.length) {
		throw new StegError(StegErrorCode.Truncated, 'Unexpected end of input');
	}
	const ivLen = envelope[ivAt];
	if (ivLen !== IV_LEN) {
		throw new StegError(StegErrorCode.Malformed, `bad IV length ${ivLen}`);
	}
	const lenAt = ivAt + 1 + ivLen;
	if (lenAt + 4 > envelope.length) {
		throw new StegError(StegErrorCode.Truncated, 'Unexpected end of input');
	}
	const ctLen = view.getUint32(lenAt, true);
	if (lenAt + 4 + ctLen !== envelope.length) {
		throw new StegError(
			StegErrorCode.Malformed,
			'ciphertext length does not match envelope size'
		);
	}

	const salt = envelope.subarray(11, ivAt);
	const iv = envelope.subarray(ivAt + 1, lenAt);
	const ciphertext = envelope.subarray(lenAt + 4);

	try {
		const key = await deriveKey(passphrase, salt, iterations);
		const plaintext = await subtle.decrypt(
			{ name: 'AES-GCM', iv: src(iv), additionalData: AAD, tagLength: 128 },
			key,
			src(ciphertext)
		);
		return new Uint8Array(plaintext);
	} catch (err) {
		if (err instanceof StegError) throw err;
		throw new StegError(
			StegErrorCode.BadPassphrase,
			'wrong passphrase, or the payload was re-compressed'
		);
	}
}

/** Cheap check so the UI can label a payload without attempting decryption. */
export function isEnvelope(bytes: Uint8Array): boolean {
	if (bytes.length < ENVELOPE_HEADER_LEN) return false;
	// Compare the magic without allocating a decoder round trip.
	return indexOfBytes(bytes, encoder.encode(ENVELOPE_MAGIC), 0) === 0;
}

async function deriveKey(
	passphrase: string,
	salt: Uint8Array,
	iterations: number
): Promise<CryptoKey> {
	const subtle = requireCrypto();
	// Import the passphrase first so PBKDF2 does not have to re-encode it.
	const material = await subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, [
		'deriveKey'
	]);
	return subtle.deriveKey(
		{ name: 'PBKDF2', salt: src(salt), iterations, hash: 'SHA-256' },
		material,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}
