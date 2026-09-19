import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveZone, type ZoneOption } from '../api/zones';

export type ZoneState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ready'; detected: ZoneOption | null }
  | { status: 'failed'; reason: string };

/** Coordinates from the browser, named by the backend. Call `request` to ask; see the effect below. */
export function useDetectedZone(): { state: ZoneState; request: () => void } {
  const [state, setState] = useState<ZoneState>({ status: 'idle' });
  const inflight = useRef<AbortController | null>(null);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: 'failed', reason: 'This browser cannot share a location.' });
      return;
    }
    inflight.current?.abort();
    const ctl = new AbortController();
    inflight.current = ctl;
    setState({ status: 'locating' });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const zone = await resolveZone(pos.coords.latitude, pos.coords.longitude, ctl.signal);
          if (!ctl.signal.aborted) setState({ status: 'ready', detected: zone });
        } catch {
          if (!ctl.signal.aborted) {
            setState({ status: 'failed', reason: 'Could not reach the zone service.' });
          }
        }
      },
      // Denying location is a normal choice, not an error — the dropdown still works.
      () => {
        if (!ctl.signal.aborted) setState({ status: 'failed', reason: 'Location was not shared.' });
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }, []);

  // Auto-locate only when permission is already granted. An undecided permission prompt on load
  // takes focus from the page, which leaves the zone <select> beneath it unable to stay open.
  useEffect(() => {
    let cancelled = false;
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => {
        if (!cancelled && p.state === 'granted') request();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      inflight.current?.abort();
    };
  }, [request]);

  return { state, request };
}
