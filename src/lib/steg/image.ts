/**
 * Image and file helpers that genuinely need the DOM, kept out of the worker.
 *
 * Decoding happens here; the worker only ever sees flat RGBA bytes. That split is what
 * lets the same engine run headless.
 */

import { isPng } from './core.ts';

export { isPng };

/** A decoded, ready-to-manipulate image. */
export interface DecodedImage {
	/** Flat RGBA, 4 bytes per pixel, row-major. */
	rgba: Uint8ClampedArray;
	width: number;
	height: number;
	/** The original file bytes, needed by Method B and by the re-encode step. */
	bytes: Uint8Array;
	/** The file's MIME type as reported by the browser, falling back to its extension. */
	mime: string;
	name: string;
}

/** Formats the browser can decode into pixels for the LSB method. */
const DECODABLE = /^image\/(png|jpeg|webp|gif|bmp|avif)$/;

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Decode a file to RGBA pixels.
 *
 * Uses `createImageBitmap` + `OffscreenCanvas` where available so the decode itself does
 * not block, falling back to a detached `<canvas>`.
 */
export async function decodeImage(file: File | Blob, name = 'image'): Promise<DecodedImage> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	const mime = file.type || guessMimeFromName(name);

	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch (err) {
		throw new Error(
			`could not decode this file as an image (${(err as Error).message}). ` +
				'PNG, JPEG, WebP, GIF, BMP and AVIF are supported.'
		);
	}

	const { width, height } = bitmap;

	// Guard rail: 40 megapixels. Beyond this the browser's own canvas is the
	// bottleneck, and the memory pressure is not worth the extra capacity.
	if (width * height > 40_000_000) {
		bitmap.close();
		throw new Error(
			`image is ${width}x${height} (over 40 megapixels). Resize it before embedding.`
		);
	}

	const canvas =
		typeof OffscreenCanvas !== 'undefined'
			? new OffscreenCanvas(width, height)
			: Object.assign(document.createElement('canvas'), { width, height });
	const ctx = canvas.getContext('2d', { willReadFrequently: true }) as
		| OffscreenCanvasRenderingContext2D
		| CanvasRenderingContext2D
		| null;
	if (!ctx) {
		bitmap.close();
		throw new Error('could not acquire a 2D canvas context');
	}

	// `imageSmoothingEnabled` is irrelevant when source and destination match 1:1, but
	// leaving it off documents that we want a verbatim copy, not a resample.
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(bitmap, 0, 0);
	bitmap.close();

	const data = ctx.getImageData(0, 0, width, height);
	return { rgba: data.data, width, height, bytes, mime, name };
}

/** True when a decoded image can act as a Method A carrier. */
export function isDecodableImage(mime: string): boolean {
	return DECODABLE.test(mime);
}

/**
 * Encode RGBA back to a PNG blob.
 *
 * PNG is mandatory for Method A: it is lossless, so the decoded pixel values survive the
 * round trip. JPEG's DCT transform re-quantises chroma and destroys the low bit.
 */
export async function encodePng(
	rgba: Uint8ClampedArray,
	width: number,
	height: number
): Promise<Blob> {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('could not acquire a 2D canvas context');
	// The cast is the same `Uint8ClampedArray` -> `ImageDataArray` narrowing as in
	// `crypto.ts`: the buffer is `ArrayBuffer`-backed in practice.
	ctx.putImageData(new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0);
	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))),
			'image/png'
		);
	});
}

export function readFileBytes(file: File | Blob): Promise<Uint8Array> {
	return file.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

/** Hand bytes to the user as a download. */
export function downloadBytes(bytes: Uint8Array | Blob, filename: string, mime?: string) {
	const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart], { type: mime ?? 'application/octet-stream' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.rel = 'noopener';
	document.body.appendChild(a);
	a.click();
	a.remove();
	// Revoke on the next tick; revoking synchronously can cancel the download in
	// some browsers.
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Decode UTF-8 bytes, replacing invalid sequences rather than throwing. */
export function decodeText(bytes: Uint8Array): string {
	return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export function encodeText(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

function guessMimeFromName(name: string): string {
	const ext = name.split('.').pop()?.toLowerCase() ?? '';
	const map: Record<string, string> = {
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		webp: 'image/webp',
		gif: 'image/gif',
		bmp: 'image/bmp',
		avif: 'image/avif',
		zip: 'application/zip',
		pdf: 'application/pdf',
		txt: 'text/plain',
		json: 'application/json'
	};
	return map[ext] ?? 'application/octet-stream';
}
