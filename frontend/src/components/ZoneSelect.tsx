import type { ReactNode } from 'react';
import type { ZoneOption } from '../api/zones';
import type { ZonePicker } from '../hooks/useZonePicker';

type Props = {
  id: string;
  picker: ZonePicker;
  className?: string;
  describe: (zone: ZoneOption) => ReactNode;
};

export function ZoneSelect({ id, picker, className, describe }: Props) {
  const { zones, zoneCode, zone, detection, locate, touch, choose } = picker;

  return (
    <div className={className}>
      <label className="sb-field-label" htmlFor={id}>
        Price zone
      </label>
      <select
        id={id}
        className="sb-field-input"
        value={zoneCode}
        onMouseDown={touch}
        onKeyDown={touch}
        onChange={(e) => choose(e.target.value)}
      >
        <option value="">Select your country…</option>
        {zones.map((z) => (
          <option key={z.code} value={z.code}>
            {z.name}
          </option>
        ))}
      </select>
      <div className="sb-field-note">
        {zone ? (
          describe(zone)
        ) : detection.status === 'idle' ? (
          <button type="button" className="sb-locate" onClick={locate}>
            Use my location
          </button>
        ) : detection.status === 'locating' ? (
          'Checking your location…'
        ) : detection.status === 'failed' ? (
          `${detection.reason} Pick your zone above.`
        ) : (
          'No zone covers your location, pick one above.'
        )}
      </div>
    </div>
  );
}
