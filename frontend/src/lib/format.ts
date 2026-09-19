
export function fixed(v: number, digits: number): string {
  return Number(v.toFixed(digits)).toFixed(digits);
}
