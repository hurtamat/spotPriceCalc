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
const APPLIANCE_PATHS = {
  ev: 'M240-360v40q0 17-11.5 28.5T200-280h-40q-17 0-28.5-11.5T120-320v-320l84-240q6-18 21.5-29t34.5-11h440q19 0 34.5 11t21.5 29l84 240v320q0 17-11.5 28.5T800-280h-40q-17 0-28.5-11.5T720-320v-40H240Zm-8-360h496l-42-120H274l-42 120Zm-32 80v200-200Zm100 160q25 0 42.5-17.5T360-540q0-25-17.5-42.5T300-600q-25 0-42.5 17.5T240-540q0 25 17.5 42.5T300-480Zm360 0q25 0 42.5-17.5T720-540q0-25-17.5-42.5T660-600q-25 0-42.5 17.5T600-540q0 25 17.5 42.5T660-480ZM520-40 280-160h160v-80l240 120H520v80ZM200-440h560v-200H200v200Z',
  pool: 'M480-240q-100 0-170-70t-70-170q0-100 70-170t170-70q100 0 170 70t70 170q0 100-70 170t-170 70Zm-30-83v-85l-60 60q14 9 28.5 15.5T450-323Zm60 0q16-3 31-9.5t29-15.5l-60-60v85Zm102-67q9-14 15.5-29t9.5-31h-85l60 60Zm-60-120h85q-3-16-9.5-31T612-570l-60 60Zm-42-42 60-60q-14-9-28.5-15.5T510-637v85Zm-30 112q17 0 28.5-11.5T520-480q0-17-11.5-28.5T480-520q-17 0-28.5 11.5T440-480q0 17 11.5 28.5T480-440Zm-30-112v-85q-16 3-31 9.5T390-612l60 60Zm-127 42h85l-60-60q-9 14-15.5 29t-9.5 31Zm25 120 60-60h-85q3 16 9.5 31t15.5 29ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z',
  boiler: 'M372-529q0 19 6.5 37t18.5 33q2-12 8-23.5t15-19.5l60-58 59 59q9 8 15 19t8 23q11-15 19.5-32t8.5-36q0-19-6-36.5T566-596q-11 5-22.5 8t-23.5 3q-30 0-55-17t-38-45q-12 12-22 25.5T387.5-593q-7.5 15-11.5 31t-4 33Zm108 53-17 17q-4 4-5.5 8t-1.5 9q0 10 7 16t17 6q10 0 17-6t7-16q0-5-1.5-9t-5.5-8l-17-17Zm0-284v76q0 17 12 28.5t29 11.5q11 0 20-6.5t16-15.5l7-10q41 23 63.5 62.5T650-527q0 70-50 118.5T480-360q-70 0-119-49t-49-119q0-77 49-137t119-95ZM240-80q-33 0-56.5-23.5T160-160v-560q0-66 47-113t113-47h320q66 0 113 47t47 113v560q0 33-23.5 56.5T720-80H240Zm0-160v80h480v-80q-30 0-48 20t-72 20q-54 0-70.5-20T480-240q-33 0-49.5 20T360-200q-54 0-70.5-20T240-240Zm120-40q33 0 49.5-20t70.5-20q54 0 72 20t48 20q30 0 48-20t72-20v-400q0-33-23.5-56.5T640-800H320q-33 0-56.5 23.5T240-720v400q54 0 70.5 20t49.5 20Z',
  dryer: 'M240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h480q33 0 56.5 23.5T800-800v640q0 33-23.5 56.5T720-80H240Zm0-80h480v-640H240v640Zm240-40q83 0 141.5-58.5T680-400q0-83-58.5-141.5T480-600q-83 0-141.5 58.5T280-400q0 83 58.5 141.5T480-200Zm0-68q-26 0-50.5-9.5T386-306l188-188q19 19 28.5 43.5T612-400q0 55-38.5 93.5T480-268ZM320-680q17 0 28.5-11.5T360-720q0-17-11.5-28.5T320-760q-17 0-28.5 11.5T280-720q0 17 11.5 28.5T320-680Zm120 0q17 0 28.5-11.5T480-720q0-17-11.5-28.5T440-760q-17 0-28.5 11.5T400-720q0 17 11.5 28.5T440-680ZM240-160v-640 640Z',
  dishwasher: 'M200-520v320h560v-320H200Zm0-80h560v-160H200v160Zm280 360q-33 0-56.5-23.5T400-320q0-27 15-57.5T480-480q50 72 65 102.5t15 57.5q0 33-23.5 56.5T480-240Zm200-400q17 0 28.5-11.5T720-680q0-17-11.5-28.5T680-720q-17 0-28.5 11.5T640-680q0 17 11.5 28.5T680-640ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-480v-160 160Z',
  ac: 'M440-80v-166L310-118l-56-56 186-186v-80h-80L174-254l-56-56 128-130H80v-80h166L118-650l56-56 186 186h80v-80L254-786l56-56 130 128v-166h80v166l130-128 56 56-186 186v80h80l186-186 56 56-128 130h166v80H714l128 130-56 56-186-186h-80v80l186 186-56 56-130-128v166h-80Z',
};

export type Appliance = keyof typeof APPLIANCE_PATHS;

export const isAppliance = (key: string): key is Appliance => key in APPLIANCE_PATHS;

export function ApplianceIcon({ kind }: { kind: Appliance }) {
  return (
    <svg className="sb-appliance-icon" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d={APPLIANCE_PATHS[kind]} />
    </svg>
  );
}
