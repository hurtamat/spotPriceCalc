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
