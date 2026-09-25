// Override at build/dev time with VITE_API_BASE_URL (see .env.example).
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5262';

export class ApiError extends Error {
  readonly status: number;

  constructor(path: string, status: number) {
    super(`GET ${path} failed: ${status}`);
    this.status = status;
  }
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (!res.ok) throw new ApiError(path, res.status);
  return (await res.json()) as T;
}
