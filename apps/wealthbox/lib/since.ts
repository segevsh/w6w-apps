/** Wealthbox timestamp as the API prints it: `2015-05-24 10:00 AM -0400` (minute precision). */
export function parseWealthboxStamp(value: unknown): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) ([AP]M) ([+-])(\d{2})(\d{2})$/.exec(
    String(value ?? "").trim(),
  );
  if (!m) return undefined;
  const hour = (Number(m[4]) % 12) + (m[6] === "PM" ? 12 : 0);
  const offset = (m[7] === "-" ? -1 : 1) * (Number(m[8]) * 60 + Number(m[9]));
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour, Number(m[5])) -
    offset * 60_000;
}

/** The same format in UTC, floored to the minute (never later than `ms`). */
export function formatWealthboxStamp(ms: number): string {
  const d = new Date(Math.floor(ms / 60_000) * 60_000);
  const p = (n: number) => String(n).padStart(2, "0");
  const h = d.getUTCHours();
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(h % 12 === 0 ? 12 : h % 12)}:${p(d.getUTCMinutes())} ${h < 12 ? "AM" : "PM"} +0000`;
}

export const PAGE = 100;
export const windowRequest = (sinceMs: number, page: number): Record<string, unknown> => ({
  updatedSince: formatWealthboxStamp(sinceMs),
  order: "updated",
  page,
  perPage: PAGE,
});
