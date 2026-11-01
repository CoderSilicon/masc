import {
	capacityBits,
	embedText,
	extractText,
	seal,
	unseal,
	StegClientError
} from '$lib/steg/client';
import { describeCapacity, friendlyError } from '$lib/steg/messages';
import {
	decodeImage,
	decodeText,
	downloadBytes,
	encodePng,
	encodeText,
	type DecodedImage
} from '$lib/steg/image';

export type Mode = 'hide' | 'reveal';

/**
 * All state for the "hide a message in an image" workbench.
 *
 * Kept out of the component so the markup stays a description of the screen and the
 * steps read top to bottom.
 */
export class PictureWorkbench {
	mode = $state<Mode>('hide');
	busy = $state(false);
	error = $state('');
	notice = $state('');

	// Hide
	cover = $state.raw<DecodedImage | null>(null);
	coverFile = $state<File | null>(null);
	message = $state('');
	password = $state('');
	capacity = $state(0);
	result = $state.raw<Blob | null>(null);
	resultName = $state('');

	// Reveal
	carrier = $state.raw<DecodedImage | null>(null);
	carrierFile = $state<File | null>(null);
	recovered = $state('');
	locked = $state(false);
	readPassword = $state('');
	encryptedPayload = $state.raw<Uint8Array | null>(null);

	private capacityRequest = 0;

	get capacityLabel() {
		return describeCapacity(this.capacity);
	}

	get canHide() {
		return !this.busy && !!this.cover && !!this.message.trim();
	}

	async chooseCover(file: File) {
		this.error = '';
		this.notice = '';
		this.discardResult();
		try {
			const image = await decodeImage(file, file.name);
			this.cover = image;
			this.coverFile = file;

			const request = ++this.capacityRequest;
			const bits = await capacityBits(image.rgba, image.width, image.height, 1);
			if (request === this.capacityRequest) this.capacity = bits;
		} catch (err) {
			this.fail(err);
		}
	}

	clearCover() {
		this.capacityRequest++;
		this.cover = null;
		this.coverFile = null;
		this.capacity = 0;
		this.discardResult();
	}

	async hide() {
		const cover = this.cover;
		if (!cover) return;
		if (!this.message.trim()) {
			this.error = 'Write a message first.';
			return;
		}

		this.busy = true;
		this.error = '';
		this.notice = '';
		try {
			let payload = encodeText(this.message);
			let encrypted = false;
			if (this.password) {
				payload = await seal(payload, this.password);
				encrypted = true;
			}

			const { rgba, report } = await embedText(
				cover.rgba,
				cover.width,
				cover.height,
				payload,
				encrypted,
				1
			);
			const blob = await encodePng(rgba, cover.width, cover.height);

			this.discardResult();
			this.result = blob;
			this.resultName = `${cover.name.replace(/\.[^.]+$/, '')}-hidden.png`;
			this.notice = `${report.bitsWritten.toLocaleString()} bits written.`;
		} catch (err) {
			this.fail(err);
		} finally {
			this.busy = false;
		}
	}

	downloadResult() {
		if (this.result) downloadBytes(this.result, this.resultName);
	}

	async chooseCarrier(file: File) {
		this.error = '';
		this.notice = '';
		this.recovered = '';
		this.locked = false;
		this.encryptedPayload = null;
		try {
			const image = await decodeImage(file, file.name);
			this.carrier = image;
			this.carrierFile = file;
			await this.reveal();
		} catch (err) {
			this.fail(err);
		}
	}

	clearCarrier() {
		this.carrier = null;
		this.carrierFile = null;
		this.recovered = '';
		this.locked = false;
		this.encryptedPayload = null;
		this.error = '';
		this.notice = '';
	}

	async reveal() {
		if (!this.carrier) return;
		this.busy = true;
		this.error = '';
		this.notice = '';
		try {
			const found = await extractText(
				this.carrier.rgba,
				this.carrier.width,
				this.carrier.height
			);
			if (found.encrypted) {
				this.encryptedPayload = found.payload;
				this.locked = true;
				this.notice = 'This message needs a password.';
				return;
			}
			this.recovered = decodeText(found.payload);
			this.notice = `${this.recovered.length.toLocaleString()} characters found.`;
		} catch (err) {
			this.fail(err);
		} finally {
			this.busy = false;
		}
	}

	async unlock() {
		if (!this.encryptedPayload || !this.readPassword) return;
		this.busy = true;
		this.error = '';
		try {
			const plain = await unseal(this.encryptedPayload, this.readPassword);
			this.recovered = decodeText(plain);
			this.locked = false;
			this.notice = `${this.recovered.length.toLocaleString()} characters found.`;
		} catch (err) {
			this.fail(err);
		} finally {
			this.busy = false;
		}
	}

	async copy() {
		try {
			await navigator.clipboard.writeText(this.recovered);
			this.notice = 'Copied.';
		} catch {
			this.error = 'Could not access the clipboard.';
		}
	}

	saveRecovered() {
		downloadBytes(encodeText(this.recovered), 'message.txt', 'text/plain');
	}

	private discardResult() {
		this.result = null;
		this.resultName = '';
	}

	private fail(err: unknown) {
		const code = err instanceof StegClientError ? err.code : 'UNKNOWN';
		this.error = friendlyError(code, err instanceof Error ? err.message : String(err));
	}
}
