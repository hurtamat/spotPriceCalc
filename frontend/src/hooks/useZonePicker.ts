import { useEffect, useRef, useState } from 'react';
import { fetchZones, type ZoneOption } from '../api/zones';
import { useDetectedZone } from './useDetectedZone';

export function useZonePicker() {
  const { state: detection, request: locate } = useDetectedZone();
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zonesStatus, setZonesStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [zoneCode, setZoneCode] = useState('');
  // A ref: re-rendering on mousedown would close the open dropdown.
  const touched = useRef(false);

  useEffect(() => {
    const ctl = new AbortController();
    fetchZones(ctl.signal)
      .then((list) => {
        setZones(list);
        setZonesStatus('ready');
      })
      .catch(() => {
        if (!ctl.signal.aborted) setZonesStatus('error');
      });
    return () => ctl.abort();
  }, [attempt]);

  useEffect(() => {
    if (detection.status === 'ready' && detection.detected && !touched.current) {
      setZoneCode(detection.detected.code);
    }
  }, [detection]);

  return {
    zones,
    zonesStatus,
    retryZones: () => {
      setZonesStatus('loading');
      setAttempt((n) => n + 1);
    },
    zoneCode,
    zone: zones.find((z) => z.code === zoneCode),
    detection,
    locate,
    touch: () => {
      touched.current = true;
    },
    choose: (code: string) => {
      touched.current = true;
      setZoneCode(code);
    },
  };
}

export type ZonePicker = ReturnType<typeof useZonePicker>;
