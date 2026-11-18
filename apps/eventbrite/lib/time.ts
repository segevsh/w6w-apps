/** Eventbrite's only accepted datetime form: UTC, whole seconds — `YYYY-MM-DDThh:mm:ssZ`. */
export const eventbriteTime = (ms: number): string =>
  new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * A `changed_since` from a user or an upstream step, in whatever form it arrived (`…T…+02:00`,
 * `….123Z`, a bare date, epoch milliseconds), rewritten to the form Eventbrite accepts. Eventbrite
 * answers 400 for any other shape. Absent or blank stays absent; an unparseable value is refused
 * here with a message that names the field, not passed on to fail at the vendor.
 */
export function toEventbriteTime(value: string | number | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  const raw = typeof value === "string" ? value.trim() : value;
  const ms = typeof raw === "number" || /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw);
  if (!Number.isFinite(ms)) {
    throw new Error(
      `Changed since: "${value}" is not a date/time. Use ISO 8601, e.g. 2026-01-01T00:00:00Z.`,
    );
  }
  return eventbriteTime(ms);
}
