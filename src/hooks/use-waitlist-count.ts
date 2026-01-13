"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseWaitlistCountOptions {
  initialCount?: number;
  pollingInterval?: number;
  enabled?: boolean;
}

interface UseWaitlistCountReturn {
  count: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DEFAULT_COUNT = 18;
const DEFAULT_POLLING_INTERVAL = 10000; // 10 seconds

export function useWaitlistCount(
  options: UseWaitlistCountOptions = {}
): UseWaitlistCountReturn {
  const {
    initialCount = DEFAULT_COUNT,
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    enabled = true,
  } = options;

  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const response = await fetch("/api/waitlist-count");
      if (!response.ok) {
        throw new Error("Failed to fetch count");
      }
      const data = await response.json();
      setCount(data.count);
      setError(null);
    } catch (err) {
      console.error("Error fetching waitlist count:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    fetchCount();

    intervalRef.current = setInterval(fetchCount, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, pollingInterval, fetchCount]);

  // Pause polling when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        fetchCount();
        intervalRef.current = setInterval(fetchCount, pollingInterval);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchCount, pollingInterval]);

  return {
    count,
    isLoading,
    error,
    refetch: fetchCount,
  };
}
