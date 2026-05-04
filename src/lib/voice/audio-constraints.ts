import type { AudioCaptureOptions } from "livekit-client";

/**
 * Browser/LiveKit audio capture constraints used for every practice call.
 *
 * - `echoCancellation` + `noiseSuppression` + `autoGainControl`: stock browser
 *   filters. They're our floor when the LiveKit Krisp filter isn't loaded
 *   (CSP, WASM blocked, etc.).
 * - `channelCount: 1`: STT and the speaker verifier expect mono.
 * - `sampleRate: 48000`: matches LiveKit's preferred publish rate. Pipecat
 *   downsamples to 16 kHz internally; capturing at 48 kHz keeps the resampler
 *   on a clean 3:1 ratio rather than fighting hardware-default oddities.
 * - `voiceIsolation`: Safari 17.4+; ignored elsewhere via ConstrainBoolean.
 */
export const VOICE_AUDIO_CONSTRAINTS: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
  // voiceIsolation is Safari 17.4+ only; livekit-client's AudioCaptureOptions
  // already permits it as part of MediaTrackConstraints.
  voiceIsolation: true,
};

/**
 * The exact `MediaStreamConstraints` we pass to `getUserMedia` for the
 * pre-call calibration probe + recording. Mirrors VOICE_AUDIO_CONSTRAINTS
 * since the verifier compares the calibration sample to the live stream.
 */
export const VOICE_GETUSERMEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 48000,
  },
  video: false,
};
