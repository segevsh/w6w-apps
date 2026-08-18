import type { ActionDefinition } from "@w6w/types";
import {
  AmplitudeClient,
  compact,
  deriveInsertId,
  json,
  MIN_ID_LENGTH,
  rejectedIndexes,
  shortIds,
} from "../lib/client.ts";

/**
 * `POST /batch` — the higher-throughput ingest endpoint.
 *
 * ## The same events, a different queue
 *
 * `/batch` and `/2/httpapi` take an identical payload and produce identical
 * data. What differs is the throughput allowance: `/batch` is intended for
 * server-side bulk loading and is throttled far more generously, at the cost of
 * a longer and less predictable delay before events appear in the UI.
 *
 * The rule of thumb this encodes: **`event-track` for events as they happen,
 * `event-batch` for backfills and bulk loads**. Sending a historical import
 * through `/2/httpapi` will be throttled per device, and sending a live
 * user action through `/batch` means it may not be queryable for minutes.
 *
 * Everything else — the 5-character id rule, insert_id deduplication, partial
 * failure by index — behaves exactly as it does on `event-track`, and is
 * handled the same way here.
 */
const action: ActionDefinition = {
  key: "event-batch",
  type: "perform",
  resource: "event",
  title: "Batch-load events",
  description:
    "Bulk-load events through the higher-throughput queue. Same payload as `event-track`, far " +
    "more generous throttling, and a longer delay before the data is queryable.",
  idempotent: true,
  params: [
    {
      key: "events",
      label: "Events",
      type: "json",
      required: true,
      default: "",
      hint: "A JSON array, the same shape `event-track` takes. Up to 2000 per request.",
    },
    {
      key: "minIdLength",
      label: "Minimum ID Length",
      type: "number",
      default: 0,
      hint: `Amplitude drops ids shorter than ${MIN_ID_LENGTH} without telling you. This is the ` +
        "usual problem in a backfill from a system with numeric ids.",
    },
    {
      key: "deriveInsertId",
      label: "Derive Insert IDs",
      type: "boolean",
      default: true,
      hint: "Matters more here than anywhere: a backfill that fails halfway and is rerun will " +
        "double-count everything already loaded without stable insert_ids.",
    },
  ],
  output: [
    { key: "ingested", type: "number", label: "Events Amplitude accepted" },
    { key: "sent", type: "number", label: "Events submitted" },
    { key: "partial", type: "boolean", label: "Some were rejected and some accepted" },
    { key: "rejectedIndexes", type: "array", label: "Which failed, by position" },
    { key: "response", type: "object", label: "Amplitude's own body" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const parsed = json(p.events, "events");
    const events = (Array.isArray(parsed) ? parsed : [parsed]) as Array<Record<string, unknown>>;
    if (events.length === 0) throw new Error("`events` must contain at least one event");
    if (events.length > 2000) {
      throw new Error(
        `Amplitude takes at most 2000 events per request — got ${events.length}. Split the batch`,
      );
    }

    const minIdLength = Number(p.minIdLength ?? 0);
    const short = shortIds(events, minIdLength > 0 ? minIdLength : MIN_ID_LENGTH);
    if (short.length > 0 && minIdLength <= 0) {
      throw new Error(
        `${short.length} id(s) are shorter than Amplitude's ${MIN_ID_LENGTH}-character minimum, ` +
          "and Amplitude removes them rather than refusing the event — a backfill would load as " +
          "anonymous. Lengthen the ids, or set `minIdLength`",
      );
    }

    const prepared = p.deriveInsertId === false ? events : await Promise.all(
      events.map(async (event) =>
        event.insert_id ? event : { ...event, insert_id: await deriveInsertId(event) }
      ),
    );

    const { body, partial } = await new AmplitudeClient(ctx).ingest({
      path: "/batch",
      body: compact({
        events: prepared,
        options: minIdLength > 0 ? { min_id_length: minIdLength } : undefined,
      }),
    });

    const rejected = rejectedIndexes(body);
    ctx.log(partial ? "warn" : "info", "batch-loaded events into Amplitude", {
      sent: events.length,
      rejected: rejected.length,
    });

    return {
      ingested: body.events_ingested ?? (partial ? events.length - rejected.length : events.length),
      sent: events.length,
      partial,
      rejectedIndexes: rejected,
      response: body,
    };
  },
};

export default action;
