import { latLng } from "./client.ts";

/**
 * A Routes API waypoint, from the one string a workflow actually has.
 *
 * Routes accepts three mutually exclusive forms — `address`, `placeId`, or
 * `location.latLng` — and they are not interchangeable in cost or in accuracy:
 *
 *  - **`placeId`** is exact and free of ambiguity. Prefer it whenever a
 *    previous step produced one.
 *  - **`location`** is exact, and puts the point wherever you said, including
 *    in the middle of a field. Routes will snap it to the nearest road, which
 *    may be the wrong side of a dual carriageway.
 *  - **`address`** makes Routes geocode the string first — convenient, and it
 *    means an ambiguous address is resolved silently, with no chance to check
 *    which of the four Springfields it picked.
 *
 * This picks the form from the shape of the input, so a workflow can hand it
 * whatever it has, and the choice is visible rather than buried.
 */
export function waypoint(value: unknown, field: string): Record<string, unknown> {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`\`${field}\` is required`);

  // A place id: Google's own prefix, or the resource-name form.
  if (/^(places\/)?ChI[A-Za-z0-9_-]{10,}$/.test(text) || /^place_id:/.test(text)) {
    const id = text.replace(/^place_id:/, "").replace(/^places\//, "");
    return { placeId: id };
  }
  // Two numbers separated by a comma is coordinates and nothing else.
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(text)) {
    return { location: { latLng: latLng(text, field) } };
  }
  return { address: text };
}

/** Which of the three forms a waypoint took, for logging. */
export function waypointKind(point: Record<string, unknown>): string {
  if (point.placeId) return "placeId";
  if (point.location) return "location";
  return "address";
}
