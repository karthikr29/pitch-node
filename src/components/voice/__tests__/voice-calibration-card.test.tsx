/**
 * VoiceCalibrationCard state-machine tests.
 *
 * Network calls and PCM capture helpers are mocked so the component is tested
 * in isolation. We assert:
 *  - Pre-flight runs first; dead-mic surfaces a banner without burning a retry.
 *  - Successful path POSTs to /api/voice/voiceprint and calls onCalibrated(b64).
 *  - Client-side gate (silent recording) rejects without calling the network.
 *  - After 2 retries → skip-or-cancel offer; clicking skip calls onCalibrated(null).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";

import { VoiceCalibrationCard } from "../voice-calibration-card";

// Mock pcm-recorder helpers so we never touch AudioContext.
const mockProbe = vi.fn();
const mockRecord = vi.fn();
const mockBytesToBase64 = vi.fn((_bytes: Uint8Array) => "ZmFrZV9hdWRpbw==");

vi.mock("@/lib/voice/pcm-recorder", () => ({
  probeMicEnergy: (...args: unknown[]) => mockProbe(...args),
  recordPcm16: (...args: unknown[]) => mockRecord(...args),
  bytesToBase64: (bytes: Uint8Array) => mockBytesToBase64(bytes),
}));

// Stub heavy three.js visualizer.
vi.mock("@/components/ui/sentient-prism-visualizer", () => ({
  SentientPrismVisualizer: () => null,
}));

// Mock getUserMedia so ensureStream() resolves.
const fakeStream = {
  active: true,
  getTracks: () => [{ stop: () => undefined }],
} as unknown as MediaStream;

beforeEach(() => {
  mockProbe.mockReset();
  mockRecord.mockReset();
  mockBytesToBase64.mockClear();
  Object.defineProperty(global.navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn(async () => fakeStream) },
    configurable: true,
  });
  global.fetch = vi.fn() as unknown as typeof fetch;
});

describe("VoiceCalibrationCard", () => {
  it("shows dead-mic banner from pre-flight without consuming a retry", async () => {
    mockProbe.mockResolvedValueOnce({ rms: 0, peak: 0 });
    const onCalibrated = vi.fn();
    const onCancel = vi.fn();
    render(
      <VoiceCalibrationCard onCalibrated={onCalibrated} onCancel={onCancel} />
    );
    expect(
      await screen.findByText(/We couldn't detect your microphone/i)
    ).toBeInTheDocument();
    expect(mockRecord).not.toHaveBeenCalled();
    expect(onCalibrated).not.toHaveBeenCalled();
  });

  it("posts PCM to enroll endpoint and calls onCalibrated on success", async () => {
    mockProbe.mockResolvedValue({ rms: 0.05, peak: 0.4 });
    mockRecord.mockResolvedValue({
      pcm: new Uint8Array(16000 * 4 * 2),
      rmsP95: 0.2,
      peakMax: 0.6,
      voicedRatio: 0.8,
      durationMs: 4000,
      sampleRate: 16000,
    });
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        voiceprint_b64: "VP_OK",
        embedding_dim: 256,
        duration_ms: 4000,
        snr_db: 18.4,
      }),
    });

    const onCalibrated = vi.fn();
    render(
      <VoiceCalibrationCard onCalibrated={onCalibrated} onCancel={() => {}} />
    );

    await waitFor(() => expect(onCalibrated).toHaveBeenCalledWith("VP_OK"));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/voice/voiceprint",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows skip-or-cancel after 2 silent retries; clicking skip emits null", async () => {
    mockProbe.mockResolvedValue({ rms: 0.05, peak: 0.4 });
    // Three silent recordings (1 initial + 2 retries) — voicedRatio < 0.20
    mockRecord.mockResolvedValue({
      pcm: new Uint8Array(0),
      rmsP95: 0,
      peakMax: 0,
      voicedRatio: 0,
      durationMs: 4000,
      sampleRate: 16000,
    });

    const onCalibrated = vi.fn();
    const user = userEvent.setup();
    render(
      <VoiceCalibrationCard onCalibrated={onCalibrated} onCancel={() => {}} />
    );

    // First failure
    const retry1 = await screen.findByRole("button", { name: /Try again/i });
    await user.click(retry1);
    // Second failure
    const retry2 = await screen.findByRole("button", { name: /Try again/i });
    await user.click(retry2);

    // Now we should see skip-or-cancel
    const skipBtn = await screen.findByRole("button", {
      name: /Continue without voice ID/i,
    });
    await user.click(skipBtn);
    expect(onCalibrated).toHaveBeenCalledWith(null);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("client-side SILENT gate skips the network call", async () => {
    mockProbe.mockResolvedValue({ rms: 0.05, peak: 0.4 });
    mockRecord.mockResolvedValue({
      pcm: new Uint8Array(0),
      rmsP95: 0.001, // below 0.005 threshold => SILENT
      peakMax: 0.001,
      voicedRatio: 0.5,
      durationMs: 4000,
      sampleRate: 16000,
    });

    render(
      <VoiceCalibrationCard onCalibrated={() => {}} onCancel={() => {}} />
    );

    await waitFor(() =>
      expect(screen.getByText(/We didn't hear anything/i)).toBeInTheDocument()
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("surfaces server TOO_NOISY response", async () => {
    mockProbe.mockResolvedValue({ rms: 0.05, peak: 0.4 });
    mockRecord.mockResolvedValue({
      pcm: new Uint8Array(16000 * 4 * 2),
      rmsP95: 0.2,
      peakMax: 0.6,
      voicedRatio: 0.8,
      durationMs: 4000,
      sampleRate: 16000,
    });
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: { code: "TOO_NOISY" } }),
    });

    render(
      <VoiceCalibrationCard onCalibrated={() => {}} onCancel={() => {}} />
    );

    await waitFor(() =>
      expect(screen.getByText(/Too noisy/i)).toBeInTheDocument()
    );
  });
});
