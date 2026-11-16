import { APPLIANCE_PATHS, type Appliance } from './appliances';

type IconProps = { size?: number; strokeWidth?: number; className?: string };

function Icon({
  size = 16,
  strokeWidth = 2.2,
  className,
  d,
}: IconProps & { d: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export const ChevronRight = (p: IconProps) => <Icon {...p} d="m9 5 7 7-7 7" />;
export const ArrowLeft = (p: IconProps) => <Icon {...p} d="M19 12H5m0 0 6-6m-6 6 6 6" />;
export const ArrowRight = (p: IconProps) => <Icon {...p} d="M5 12h14m0 0-6-6m6 6-6 6" />;
export const Check = (p: IconProps) => <Icon {...p} d="M20 6 9 17l-5-5" />;
export const Copy = (p: IconProps) => (
  <Icon {...p} d="M11 9h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM5 15V5a2 2 0 0 1 2-2h10" />
);
export const Clock = (p: IconProps) => (
  <Icon {...p} d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7v5l3.5 2" />
);

// Material Symbols Outlined paths on their native 960-unit grid; Apache-2.0, see public/fonts/LICENSE-APACHE.txt.
export function ApplianceIcon({ kind }: { kind: Appliance }) {
  return (
    <svg className="sb-appliance-icon" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d={APPLIANCE_PATHS[kind]} />
    </svg>
  );
}
