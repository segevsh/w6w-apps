/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` (UTC) of `now − days`. */
export function utcDate(days: number): string {
  return new Date(clock.now() - days * DAY_MS).toISOString().slice(0, 10);
}
