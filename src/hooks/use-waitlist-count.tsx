"use client";

import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from "react";

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
const DEFAULT_POLLING_INTERVAL = 30000; // 30 seconds

// Shared context for waitlist count - all components share the same polling instance
interface WaitlistCountContextValue {
  count: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const WaitlistCountContext = createContext<WaitlistCountContextValue | null>(null);

// Provider component that handles the actual polling
export function WaitlistCountProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(DEFAULT_COUNT);
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
    fetchCount();
    intervalRef.current = setInterval(fetchCount, DEFAULT_POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchCount]);

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
        intervalRef.current = setInterval(fetchCount, DEFAULT_POLLING_INTERVAL);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchCount]);

  return (
    <WaitlistCountContext.Provider value={{ count, isLoading, error, refetch: fetchCount }}>
      {children}
    </WaitlistCountContext.Provider>
  );
}

// Hook to consume the shared context
export function useWaitlistCount(
  options: UseWaitlistCountOptions = {}
): UseWaitlistCountReturn {
  const context = useContext(WaitlistCountContext);
  const { initialCount = DEFAULT_COUNT } = options;

  // If used outside provider, return default values
  if (!context) {
    return {
      count: initialCount,
      isLoading: false,
      error: null,
      refetch: async () => { },
    };
  }

  return context;
}
