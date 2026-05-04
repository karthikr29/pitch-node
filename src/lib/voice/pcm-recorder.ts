/**
 * Browser-side PCM16 capture for voiceprint calibration.
 *
 * Two helpers:
 *  - probeMicEnergy(stream, durationMs): hidden 0.5s mic check that returns
 *    quick rms/peak summary (catches a fully muted/dead mic before the user
 *    spends 4s wondering why nothing's happening).
 *  - recordPcm16(stream, durationMs): captures up to durationMs and returns
 *    16-bit LE PCM bytes resampled to 16 kHz mono, plus a quality summary
 *    (rmsP95 / peakMax / voicedRatio) used for client-side gates.
 *
 * Both use AudioWorklet (not the deprecated ScriptProcessor) and never copy
 * the stream's tracks — the caller owns the MediaStream lifecycle.
 */

const WORKLET_URL = "/voice-worklet/pcm-capturer.js";
const TARGET_SAMPLE_RATE = 16000;
const PROBE_FRAME_SECS = 0.02;

export interface MicEnergyProbe {
  rms: number;
  peak: number;
}

export interface PcmRecording {
  pcm: Uint8Array;
  rmsP95: number;
  peakMax: number;
  voicedRatio: number;
  durationMs: number;
  sampleRate: number;
}

let _workletReadyContexts: WeakSet<AudioContext> | null = null;

async function ensureWorkletLoaded(ctx: AudioContext): Promise<void> {
  if (!_workletReadyContexts) _workletReadyContexts = new WeakSet();
  if (_workletReadyContexts.has(ctx)) return;
  await ctx.audioWorklet.addModule(WORKLET_URL);
  _workletReadyContexts.add(ctx);
}

function downsampleTo16k(input: Float32Array, srIn: number): Float32Array {
  if (srIn === TARGET_SAMPLE_RATE) return input;
  // Linear interpolation downsample. Voice band is heavily anti-aliased by
  // the mic + browser AGC stack; for speaker-verification quality this is
  // sufficient (Resemblyzer's preprocess_wav resamples again internally).
  const ratio = srIn / TARGET_SAMPLE_RATE;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcIdx = i * ratio;
    const i0 = Math.floor(srcIdx);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = srcIdx - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

function floatToPcm16Bytes(samples: Float32Array): Uint8Array {
  const buf = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < samples.length; i++) {
    let s = samples[i];
    if (s > 1) s = 1;
    if (s < -1) s = -1;
    const v = Math.round(s * 32767);
    view.setInt16(i * 2, v, true);
  }
  return new Uint8Array(buf);
}

interface QualitySummary {
  rmsP95: number;
  peakMax: number;
  voicedRatio: number;
}

function computeQuality(samples: Float32Array, sampleRate: number): QualitySummary {
  if (samples.length === 0) {
    return { rmsP95: 0, peakMax: 0, voicedRatio: 0 };
  }
  const frame = Math.max(1, Math.round(sampleRate * PROBE_FRAME_SECS));
  const nFrames = Math.floor(samples.length / frame);
  if (nFrames < 1) {
    let peak = 0;
    let sumSq = 0;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i];
      const a = Math.abs(v);
      if (a > peak) peak = a;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / samples.length);
    return { rmsP95: rms, peakMax: peak, voicedRatio: rms >= 0.01 ? 1 : 0 };
  }
  const rmsPerFrame = new Float64Array(nFrames);
  let peakMax = 0;
  let voicedFrames = 0;
  for (let f = 0; f < nFrames; f++) {
    let sumSq = 0;
    let peak = 0;
    const start = f * frame;
    for (let j = 0; j < frame; j++) {
      const v = samples[start + j];
      sumSq += v * v;
      const a = Math.abs(v);
      if (a > peak) peak = a;
    }
    const rms = Math.sqrt(sumSq / frame);
    rmsPerFrame[f] = rms;
    if (peak > peakMax) peakMax = peak;
    if (rms >= 0.01) voicedFrames++;
  }
  const sorted = Array.from(rmsPerFrame).sort((a, b) => a - b);
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return {
    rmsP95: sorted[p95Index],
    peakMax,
    voicedRatio: voicedFrames / nFrames,
  };
}

async function captureFloat32(
  stream: MediaStream,
  durationMs: number
): Promise<{ samples: Float32Array; sampleRate: number }> {
  const AudioCtx =
    typeof window !== "undefined"
      ? window.AudioContext ||
        ((window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext as typeof AudioContext | undefined)
      : undefined;
  if (!AudioCtx) {
    throw new Error("AudioContext is not available");
  }
  const ctx = new AudioCtx();
  const sampleRate = ctx.sampleRate;
  await ensureWorkletLoaded(ctx);

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "pcm-capturer", {
    processorOptions: { chunkSize: 1024 },
  });

  const chunks: Float32Array[] = [];
  let totalSamples = 0;
  const targetSamples = Math.ceil((durationMs / 1000) * sampleRate);

  return new Promise<{ samples: Float32Array; sampleRate: number }>((resolve, reject) => {
    let stopped = false;

    const stop = (errOrSamples?: Error | Float32Array) => {
      if (stopped) return;
      stopped = true;
      try {
        node.port.postMessage({ type: "stop" });
      } catch {
        /* ignore */
      }
      try {
        source.disconnect();
        node.disconnect();
      } catch {
        /* ignore */
      }
      // Close the AudioContext (don't await — the recorder must resolve fast).
      void ctx.close().catch(() => {});

      if (errOrSamples instanceof Error) {
        reject(errOrSamples);
        return;
      }
      const merged = mergeChunks(chunks, totalSamples);
      resolve({ samples: merged, sampleRate });
    };

    node.port.onmessage = (event: MessageEvent) => {
      const data = event.data as Float32Array;
      if (!data || data.length === 0 || stopped) return;
      chunks.push(data);
      totalSamples += data.length;
      if (totalSamples >= targetSamples) stop();
    };

    source.connect(node);
    node.connect(ctx.destination); // required to keep the graph alive in some browsers

    // Hard timeout in case the worklet never reaches targetSamples (e.g. silent input).
    setTimeout(() => stop(), durationMs + 500);
  });
}

function mergeChunks(chunks: Float32Array[], total: number): Float32Array {
  const out = new Float32Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

export async function probeMicEnergy(
  stream: MediaStream,
  durationMs = 500
): Promise<MicEnergyProbe> {
  const { samples } = await captureFloat32(stream, durationMs);
  if (samples.length === 0) return { rms: 0, peak: 0 };
  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sumSq += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  return { rms: Math.sqrt(sumSq / samples.length), peak };
}

export async function recordPcm16(
  stream: MediaStream,
  durationMs: number
): Promise<PcmRecording> {
  const { samples, sampleRate } = await captureFloat32(stream, durationMs);
  // Compute quality on the captured-rate samples (more accurate than after
  // downsampling, since downsampling smooths peaks).
  const quality = computeQuality(samples, sampleRate);
  const downsampled = downsampleTo16k(samples, sampleRate);
  const pcm = floatToPcm16Bytes(downsampled);
  return {
    pcm,
    rmsP95: quality.rmsP95,
    peakMax: quality.peakMax,
    voicedRatio: quality.voicedRatio,
    durationMs: Math.round((downsampled.length * 1000) / TARGET_SAMPLE_RATE),
    sampleRate: TARGET_SAMPLE_RATE,
  };
}

/**
 * Browser-safe base64 encode for a binary Uint8Array. Avoids `btoa` on long
 * strings (Safari throws "InvalidCharacterError" past ~1 MB).
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // 32 kB
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize))
    );
  }
  return btoa(binary);
}
