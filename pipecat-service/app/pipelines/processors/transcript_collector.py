"""Collects transcript entries from STT output for periodic flushing."""
import time

class TranscriptCollector:
    def __init__(self):
        self.entries: list[dict] = []

    def add_entry(self, speaker: str, content: str, confidence: float = 1.0):
        self.entries.append({
            "speaker": speaker,
            "content": content,
            "timestamp_ms": int(time.time() * 1000),
            "confidence": confidence,
        })

    def flush(self) -> list[dict]:
        entries = self.entries.copy()
        self.entries.clear()
        return entries

    def get_full_transcript(self) -> list[dict]:
        return self.entries.copy()
