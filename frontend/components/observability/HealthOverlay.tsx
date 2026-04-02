'use client';

import { useEffect } from 'react';
import { useHealthStore } from '@/stores/health-store';

interface HealthOverlayProps {
  sessionId: string;
}

/**
 * Invisible component that polls machine health every 5 seconds.
 * Updates the health store so MachineNode can read border colors.
 */
export default function HealthOverlay({ sessionId }: HealthOverlayProps) {
  const fetchStatus = useHealthStore((s) => s.fetchStatus);

  useEffect(() => {
    // Initial fetch
    fetchStatus(sessionId);

    // Poll every 5 seconds
    const interval = setInterval(() => {
      fetchStatus(sessionId);
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId, fetchStatus]);

  // This component renders nothing — it only drives the health store
  return null;
}
