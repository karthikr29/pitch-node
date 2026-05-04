import { describe, expect, it } from "vitest";

import { bytesToBase64 } from "../pcm-recorder";

describe("bytesToBase64", () => {
  it("encodes empty array", () => {
    expect(bytesToBase64(new Uint8Array(0))).toBe("");
  });

  it("encodes ASCII bytes", () => {
    const txt = "voiceprint";
    const bytes = new TextEncoder().encode(txt);
    expect(bytesToBase64(bytes)).toBe(btoa(txt));
  });

  it("handles a 100KB blob without crashing (Safari btoa stack-limit guard)", () => {
    const big = new Uint8Array(100_000).fill(0x55);
    const out = bytesToBase64(big);
    // 100_000 bytes -> ceil(100_000/3)*4 = 133_336 base64 chars (no padding)
    expect(out.length).toBeGreaterThan(133_000);
    // Round-trip a sample portion
    const decoded = atob(out.slice(0, 100));
    for (let i = 0; i < decoded.length; i++) {
      expect(decoded.charCodeAt(i)).toBe(0x55);
    }
  });
});
