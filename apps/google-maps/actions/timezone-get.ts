import type { ActionDefinition } from "@w6w/types";
import { LANGUAGE_PARAM } from "../lib/params.ts";
import { latLng, MapsClient, pointString, query } from "../lib/client.ts";

/**
 * `GET /maps/api/timezone/json` — which time zone a point is in, and what the
 * offset was **at a particular moment**.
 *
 * ## The timestamp is required, and it is not metadata
 *
 * The API will not answer without a `timestamp`, and the reason is the whole
 * point of the endpoint: the offset for a location is a function of *when*.
 * Ask about Berlin in January and `dstOffset` is 0; ask in July and it is 3600.
 * Passing "now" when the question was about a booking next winter gives a
 * confidently wrong answer that is exactly one hour out — the classic
 * scheduling bug, and it only shows up twice a year.
 *
 * So `timestamp` here defaults to now for convenience, and the hint says
 * plainly what to pass instead when the question is about another moment.
 *
 * ## The offset arrives in two halves
 *
 * `rawOffset` is the zone's standard offset from UTC; `dstOffset` is the extra
 * seconds in force at that instant. **Neither is the answer on its own** — the
 * total is the sum, and this action returns it as `totalOffsetSeconds` and
 * `utcOffset` so nobody has to remember which of the two to use.
 *
 * ## And this one spells the error field differently
 *
 * Every other legacy web service returns `error_message`. The Time Zone API
 * returns `errorMessage`. Both were confirmed live on 2026-08-18, and
 * `describeLegacy` reads both, or a refused key here would report no reason
 * at all.
 */
const action: ActionDefinition = {
  key: "timezone-get",
  type: "read",
  resource: "timezone",
  title: "Get a time zone",
  description:
    "The time zone at a point, and its offset AT A GIVEN MOMENT — the offset depends on the " +
    "date, so asking about 'now' when the question is about next winter is off by an hour.",
  params: [
    {
      key: "location",
      label: "Location",
      type: "string",
      required: true,
      default: "",
      hint: "`lat,lng` — latitude first.",
    },
    {
      key: "timestamp",
      label: "At",
      type: "string",
      default: "",
      hint: "Unix seconds, or an ISO date-time. Defaults to now — but pass the moment you " +
        "actually care about, because daylight saving makes the offset a function of the date.",
    },
    LANGUAGE_PARAM,
  ],
  output: [
    { key: "timeZoneId", type: "string", label: "IANA id, e.g. Europe/Berlin" },
    { key: "timeZoneName", type: "string", label: "Human name at that moment" },
    { key: "rawOffsetSeconds", type: "number", label: "Standard offset from UTC" },
    { key: "dstOffsetSeconds", type: "number", label: "Extra seconds in force at that moment" },
    { key: "totalOffsetSeconds", type: "number", label: "The two added — the real offset" },
    { key: "utcOffset", type: "string", label: "The same, as +HH:MM" },
    { key: "timestamp", type: "number", label: "The moment the answer is for" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const point = latLng(p.location, "location");
    const timestamp = parseTimestamp(p.timestamp);

    const body = await new MapsClient(ctx).legacy<{
      status?: string;
      dstOffset?: number;
      rawOffset?: number;
      timeZoneId?: string;
      timeZoneName?: string;
    }>(
      "/timezone/json",
      query({
        location: pointString(point),
        timestamp,
        language: p.languageCode,
      }),
      "Time Zone API",
    );

    const rawOffset = Number(body.rawOffset ?? 0);
    const dstOffset = Number(body.dstOffset ?? 0);
    const total = rawOffset + dstOffset;

    return {
      timeZoneId: body.timeZoneId,
      timeZoneName: body.timeZoneName,
      rawOffsetSeconds: rawOffset,
      dstOffsetSeconds: dstOffset,
      // The sum, because using either half alone is the bug this action exists
      // to avoid.
      totalOffsetSeconds: total,
      utcOffset: formatOffset(total),
      timestamp,
    };
  },
};

/** Unix seconds, an ISO string, or now. */
export function parseTimestamp(value: unknown): number {
  const text = String(value ?? "").trim();
  if (!text) return Math.floor(Date.now() / 1000);
  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    // A pasted JavaScript timestamp is milliseconds, and would land in the year
    // 56000 — where every zone answers, wrongly and without complaint.
    return seconds > 100_000_000_000 ? Math.floor(seconds / 1000) : seconds;
  }
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) {
    throw new Error(`\`timestamp\` is neither Unix seconds nor a parseable date: ${text}`);
  }
  return Math.floor(parsed / 1000);
}

/** Seconds to `+HH:MM`, which is what anything downstream will want. */
export function formatOffset(seconds: number): string {
  const sign = seconds < 0 ? "-" : "+";
  const absolute = Math.abs(seconds);
  const hours = String(Math.floor(absolute / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((absolute % 3600) / 60)).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

export default action;
