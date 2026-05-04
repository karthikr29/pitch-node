/**
 * AudioWorkletProcessor that posts mono Float32 audio to the main thread.
 *
 * The browser hands us audio at the AudioContext's sampleRate (typically the
 * mic's rate, e.g. 48000). The main thread is responsible for resampling
 * down to 16 kHz mono PCM16 before sending to the server.
 *
 * Each `process()` call receives a 128-frame quantum, so we buffer up to
 * `chunkSize` (default 1024 frames = ~21ms @48kHz) before posting.
 */
class PcmCapturer extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this._chunkSize = Math.max(128, opts.chunkSize || 1024);
    this._buffer = new Float32Array(this._chunkSize);
    this._offset = 0;
    this._stopped = false;

    this.port.onmessage = (event) => {
      if (event.data && event.data.type === "stop") {
        this._stopped = true;
        if (this._offset > 0) {
          this._flush();
        }
      }
    };
  }

  _flush() {
    if (this._offset === 0) return;
    const chunk = this._buffer.slice(0, this._offset);
    this.port.postMessage(chunk, [chunk.buffer]);
    this._buffer = new Float32Array(this._chunkSize);
    this._offset = 0;
  }

  process(inputs) {
    if (this._stopped) return false;
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel || channel.length === 0) return true;

    let i = 0;
    while (i < channel.length) {
      const remaining = this._chunkSize - this._offset;
      const take = Math.min(remaining, channel.length - i);
      this._buffer.set(channel.subarray(i, i + take), this._offset);
      this._offset += take;
      i += take;
      if (this._offset >= this._chunkSize) {
        this._flush();
      }
    }
    return true;
  }
}

registerProcessor("pcm-capturer", PcmCapturer);
