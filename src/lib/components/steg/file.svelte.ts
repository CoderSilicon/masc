import {
	attachFile,
	carveFile,
	detachFile,
	seal,
	unseal,
	StegClientError
} from '$lib/steg/client';
import { friendlyError } from '$lib/steg/messages';
import { downloadBytes, readFileBytes } from '$lib/steg/image';
import type { CarveCandidate, HiddenFile } from '$lib/steg/types';

export type Mode = 'hide' | 'reveal';

/**
 * All state for the "hide a whole file inside another file" workbench.
 *
 * The component only renders this; every worker call and piece of bookkeeping lives
 * here, so both flows stay readable.
 */
export class FileWorkbench {
	mode = $state<Mode>('hide');
	busy = $state(false);
	error = $state('');
	notice = $state('');

	// Hide
	coverFile = $state<File | null>(null);
	coverBytes = $state.raw<Uint8Array | null>(null);
	secretFile = $state<File | null>(null);
	secretBytes = $state.raw<Uint8Array | null>(null);
	password = $state('');
	result = $state.raw<Uint8Array | null>(null);
	resultName = $state('');

	// Reveal
	containerFile = $state<File | null>(null);
	hidden = $state.raw<HiddenFile | null>(null);
	restored = $state.raw<Uint8Array | null>(null);
	locked = $state(false);
	readPassword = $state('');
	candidates = $state.raw<CarveCandidate[]>([]);

	get canHide() {
		return !this.busy && !!this.coverFile && !!this.secretFile;
	}

	async chooseCover(file: File) {
		this.error = '';
		this.notice = '';
		this.result = null;
		try {
			this.coverBytes = await readFileBytes(file);
			this.coverFile = file;
		} catch (err) {
			this.fail(err);
		}
	}

	clearCover() {
		this.coverFile = null;
		this.coverBytes = null;
		this.result = null;
	}

	async chooseSecret(file: File) {
		this.error = '';
		this.notice = '';
		this.result = null;
		try {
			this.secretBytes = await readFileBytes(file);
			this.secretFile = file;
		} catch (err) {
			this.fail(err);
		}
	}

	clearSecret() {
		this.secretFile = null;
		this.secretBytes = null;
		this.result = null;
	}

	async hide() {
		if (!this.coverBytes || !this.secretFile || !this.secretBytes) return;

		this.busy = true;
		this.error = '';
		this.notice = '';
		try {
			let payload = this.secretBytes;
			let name = this.secretFile.name;
			if (this.password) {
				payload = await seal(payload, this.password);
				name = `${this.secretFile.name}.enc`;
			}

			const bytes = await attachFile(
				this.coverBytes,
				name,
				this.secretFile.type || 'application/octet-stream',
				payload
			);
			const stem = (this.coverFile?.name ?? 'file').replace(/\.[^.]+$/, '');
			const ext = this.coverFile?.name.split('.').pop() ?? 'bin';

			this.result = bytes;
			this.resultName = `${stem}-hidden.${ext}`;
			this.notice = 'File hidden. Download it and keep that exact copy.';
		} catch (err) {
			this.fail(err);
		} finally {
			this.busy = false;
		}
	}

	downloadResult() {
		if (this.result) {
			downloadBytes(this.result, this.resultName, this.coverFile?.type);
		}
	}

	async chooseContainer(file: File) {
		this.error = '';
		this.notice = '';
		this.hidden = null;
		this.restored = null;
		this.candidates = [];
		this.locked = false;
		this.containerFile = file;
		this.busy = true;
		try {
			const bytes = await readFileBytes(file);
			const scan = await carveFile(bytes);
			this.candidates = scan.candidates;

			try {
				const found = await detachFile(bytes);
				this.hidden = found.hidden;
				this.restored = found.decoy;
				this.locked = looksEncrypted(found.hidden.name, found.hidden.payload);
				this.notice = this.locked
					? 'Found a password-protected file.'
					: 'Found a hidden file.';
			} catch {
				this.notice = this.candidates.length
					? `${this.candidates.length} possible file(s) in the extra data.`
					: 'Nothing hidden in this file.';
			}
		} catch (err) {
			this.fail(err);
		} finally {
			this.busy = false;
		}
	}

	clearContainer() {
		this.containerFile = null;
		this.hidden = null;
		this.restored = null;
		this.candidates = [];
		this.locked = false;
		this.error = '';
		this.notice = '';
	}

	async unlock() {
		if (!this.hidden || !this.readPassword) return;
		this.busy = true;
		this.error = '';
		try {
			const plain = await unseal(this.hidden.payload, this.readPassword);
			this.hidden = {
				...this.hidden,
				name: this.hidden.name.replace(/\.enc$/, ''),
				payload: plain
			};
			this.locked = false;
			this.notice = 'Unlocked.';
		} catch (err) {
			this.fail(err);
		} finally {
			this.busy = false;
		}
	}

	downloadHidden() {
		if (this.hidden) downloadBytes(this.hidden.payload, this.hidden.name, this.hidden.mime);
	}

	downloadRestored() {
		if (!this.restored) return;
		const original = this.containerFile?.name ?? 'file';
		const stem = original.replace(/\.[^.]+$/, '');
		const ext = original.split('.').pop() ?? 'bin';
		downloadBytes(this.restored, `${stem}-clean.${ext}`, this.containerFile?.type);
	}

	downloadCandidate(candidate: CarveCandidate) {
		downloadBytes(candidate.payload, candidate.suggestedName, candidate.mime);
	}

	private fail(err: unknown) {
		const code = err instanceof StegClientError ? err.code : 'UNKNOWN';
		this.error = friendlyError(code, err instanceof Error ? err.message : String(err));
	}
}

/** Our own marker, plus the envelope magic in case the file was renamed. */
function looksEncrypted(name: string, payload: Uint8Array) {
	if (name.endsWith('.enc')) return true;
	const magic = 'STGECRY1';
	if (payload.length < magic.length) return false;
	for (let i = 0; i < magic.length; i++) {
		if (payload[i] !== magic.charCodeAt(i)) return false;
	}
	return true;
}
