'use client';
import { useEffect } from 'react';

export function SentryInit() {
  useEffect(() => {
    import('../instrumentation-client');
  }, []);
  return null;
}
