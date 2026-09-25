export function fixed(v: number, digits: number): string {
  return Number(v.toFixed(digits)).toFixed(digits);
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
