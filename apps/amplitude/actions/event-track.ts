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
 * `POST /2/httpapi` — send events.
 *
 * Two things about this endpoint account for most of the bad data in most
 * Amplitude projects, and both are silent.
 *
 * ## Short ids are removed, not rejected
 *
 * Amplitude's documentation is explicit: ids shorter than **5 characters** are
 * *"removed from events"*. The event is still accepted, still ingested, still
 * counted — and attached to nobody. A workflow forwarding numeric ids from
 * another system (`42`, `1071`) produces a stream of anonymous events, and the
 * `200` says `events_ingested: 1`.
 *
 * This action checks before sending, and either refuses with the offending ids
 * named or, if `minIdLength` is set, sends `options.min_id_length` so Amplitude
 * keeps them.
 *
 * ## A retry double-counts unless `insert_id` is stable
 *
 * Deduplication is the only protection, and it keys on `insert_id` being *the
 * same across attempts*. A freshly generated UUID achieves nothing: the retry
 * carries a different one and both events land.
 *
 * So `insert_id` is derived from the event's own content — identical payload,
 * identical id, deduplicated within Amplitude's 7-day window. A caller who
 * genuinely wants two identical events to both count supplies their own.
 *
 * ## A 400 is usually a partial success
 *
 * The body names the failed events by **index** —
 * `events_with_invalid_fields`, `events_with_missing_fields`,
 * `silenced_events`, `throttled_events`. Everything not named was accepted.
 * Resending the whole batch is therefore the wrong response; this action
 * returns `rejectedIndexes` so a caller can resend only those.
 */
const action: ActionDefinition = {
  key: "event-track",
  type: "perform",
  resource: "event",
  title: "Track events",
  description:
    "Send events. Ids under 5 characters are SILENTLY REMOVED by Amplitude, and a retry " +
    "double-counts unless insert_id is stable — both are handled here.",
  idempotent: true,
  params: [
    {
      key: "events",
      label: "Events",
      type: "json",
      required: true,
      default: "",
      hint: 'A JSON array, e.g. [{"user_id":"user-1071","event_type":"Checkout Completed",' +
        '"event_properties":{"total":42}}]. Each needs a user_id or device_id and an event_type.',
    },
    {
      key: "minIdLength",
      label: "Minimum ID Length",
      type: "number",
      default: 0,
      hint: `Amplitude's default is ${MIN_ID_LENGTH} and it DROPS shorter ids without telling ` +
        "you. Set this lower if your ids really are short — otherwise the events arrive anonymous.",
    },
    {
      key: "deriveInsertId",
      label: "Derive Insert IDs",
      type: "boolean",
      default: true,
      hint: "Derives a stable insert_id from each event's content, so a retry deduplicates " +
        "instead of double-counting. Off means retries create duplicates unless you set your own.",
    },
  ],
  output: [
    { key: "ingested", type: "number", label: "Events Amplitude accepted" },
    { key: "sent", type: "number", label: "Events submitted" },
    { key: "partial", type: "boolean", label: "Some were rejected and some accepted" },
    {
      key: "rejectedIndexes",
      type: "array",
      label: "Which failed, by position — resend only these",
    },
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

    for (const [index, event] of events.entries()) {
      if (!event?.event_type) throw new Error(`events[${index}] has no \`event_type\``);
      if (!event?.user_id && !event?.device_id) {
        throw new Error(`events[${index}] has neither \`user_id\` nor \`device_id\``);
      }
    }

    const minIdLength = Number(p.minIdLength ?? 0);
    const threshold = minIdLength > 0 ? minIdLength : MIN_ID_LENGTH;
    const short = shortIds(events, threshold);
    if (short.length > 0 && minIdLength <= 0) {
      const sample = short.slice(0, 3)
        .map((s) => `events[${s.index}].${s.field} = ${JSON.stringify(s.value)}`)
        .join(", ");
      throw new Error(
        `${short.length} id(s) are shorter than Amplitude's ${MIN_ID_LENGTH}-character minimum ` +
          `(${sample}). Amplitude does NOT reject these — it removes the id and ingests the ` +
          "event anonymously, so the data looks fine and belongs to nobody. Either lengthen the " +
          "ids, or set `minIdLength` to accept them as they are",
      );
    }

    // A stable id is what makes a retry deduplicate rather than double-count.
    const prepared = p.deriveInsertId === false ? events : await Promise.all(
      events.map(async (event) =>
        event.insert_id ? event : { ...event, insert_id: await deriveInsertId(event) }
      ),
    );

    const client = new AmplitudeClient(ctx);
    const { body, partial } = await client.ingest({
      path: "/2/httpapi",
      body: compact({
        events: prepared,
        options: minIdLength > 0 ? { min_id_length: minIdLength } : undefined,
      }),
    });

    const rejected = rejectedIndexes(body);
    if (partial) {
      ctx.log("warn", "Amplitude rejected some events and accepted the rest", {
        sent: events.length,
        rejected: rejected.length,
      });
    } else {
      ctx.log("info", "sent events to Amplitude", {
        sent: events.length,
        ingested: body.events_ingested,
      });
    }

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
