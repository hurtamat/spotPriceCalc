import { useEffect, useState } from 'react';
import { resolveZone, type ZoneOption } from '../api/zones';

export type ZoneState =
  | { status: 'locating' }
  | { status: 'ready'; detected: ZoneOption | null }
  | { status: 'failed'; reason: string };

/** Ask the browser for coordinates, then let the backend name the zone covering them. */
export function useDetectedZone(): ZoneState {
  const [state, setState] = useState<ZoneState>({ status: 'locating' });

  useEffect(() => {
    const ctl = new AbortController();

    if (!navigator.geolocation) {
      setState({ status: 'failed', reason: 'This browser cannot share a location.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const zone = await resolveZone(pos.coords.latitude, pos.coords.longitude, ctl.signal);
          setState({ status: 'ready', detected: zone });
        } catch {
          if (!ctl.signal.aborted) {
            setState({ status: 'failed', reason: 'Could not reach the zone service.' });
          }
        }
      },
      // Denying location is a normal choice, not an error — the dropdown still works.
      () => setState({ status: 'failed', reason: 'Location was not shared.' }),
      { timeout: 10000, maximumAge: 600000 },
    );

    return () => ctl.abort();
  }, []);

  return state;
}
