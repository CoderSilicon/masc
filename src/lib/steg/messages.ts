/**
 * Plain-language messages for the workbench.
 *
 * The engine deliberately returns technical error codes and precise wording, because it
 * is also a library and the Rust core emits the same strings. This module is the single
 * place where those become something a non-technical user can act on.
 */

import { StegErrorCode } from './types';

/** A short, human explanation of what went wrong and what to try next. */
export function friendlyError(code: string, fallback: string): string {
	switch (code) {
		case StegErrorCode.NoContainer:
			return 'No hidden message found in this file. Either it has no message, or the file was changed after it was hidden.';

		case StegErrorCode.Checksum:
			return 'The file looks encoded, but its pixels have changed since the message was hidden. This happens when an app re-saves or re-compresses the image. Use the original file, not a copy or a screenshot.';

		case StegErrorCode.Capacity:
			return 'The message is too big for this image. Try a larger image, or a shorter message. An image can hide roughly one letter for every 8 pixels.';

		case StegErrorCode.BadPassphrase:
			return 'That password is not right, or the file has been changed since it was hidden.';

		case StegErrorCode.Malformed:
			return 'This file is not in the expected format, so it cannot be read. It may be damaged or truncated.';

		case StegErrorCode.Truncated:
			return 'The file ends earlier than expected. It may have been cut short during transfer.';

		case StegErrorCode.Crypto:
			return fallback;

		case 'NO_WORKER':
			return 'Hidden message tools only work in the browser. This page loaded somewhere they are unavailable.';

		case 'WORKER_CRASHED':
			return 'Something went wrong while processing. Try again with a smaller file.';

		default:
			return fallback;
	}
}

/** Language for the method pickers, kept short enough to scan. */
export const METHOD_A_BLURB = 'Hide a message in the pixels of an image.';
export const METHOD_B_BLURB = 'Attach a whole file to an image or document.';

/** How much room a cover image has, in words a non-technical reader understands. */
export function describeCapacity(bits: number): string {
	if (bits <= 0) return '—';
	const chars = Math.floor((bits - 160) / 8);
	if (chars < 1024) return `${chars.toLocaleString()} characters`;
	return `${(chars / 1024).toFixed(1)}k characters`;
}
