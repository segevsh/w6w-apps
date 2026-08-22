import type { ActionDefinition } from "@w6w/types";
import { json, MixpanelClient } from "../lib/client.ts";

/**
 * `POST /import` on the ingestion host — the **authenticated** way to write
 * events, and the reason this app does not use `/track`.
 *
 * ## Why not `/track`
 *
 * Measured against `api.mixpanel.com` 2026-08-18, `/track` answers **HTTP 200
 * for everything**, including a completely bogus project token:
 *
 *   POST /track?verbose=1  {"event":"test","properties":{"token":"bogustoken",…}}
 *   → 200  {"error":null,"status":1}
 *
 * The token is not validated at ingest, so a workflow using `/track` cannot
 * learn that its events are going nowhere. Only structural problems are caught
 * (`{"error":"event, missing","status":0}`), and even those come back inside a
 * `200`.
 *
 * `/import` authenticates with the service account, validates with `strict=1`,
 * and answers a real status code. A failure is a failure.
 *
 * ## `$insert_id` is what makes a retry safe
 *
 * Mixpanel deduplicates on the tuple *(event, time, distinct_id, $insert_id)*,
 * so an event sent twice with the same `$insert_id` appears once. That is the
 * only thing standing between a retried workflow and double-counted revenue,
 * and it is why this action can declare itself idempotent — as long as the ids
 * are stable. **This action refuses events without one**, rather than letting
 * Mixpanel generate a fresh one per attempt.
 *
 * ## A 400 does not mean nothing happened
 *
 * With `strict=1`, Mixpanel validates each record and **imports the valid ones
 * anyway**, reporting the rest in `failed_records` with an index and a reason.
 * So a partial failure has already written part of the batch — which is,
 * again, survivable only because `$insert_id` makes the retry idempotent. The
 * error message surfaces the first failing record so the cause is visible
 * without digging.
 *
 * Limits: 2,000 events per request, 10 MB uncompressed, 1 MB per event.
 */
const MAX_EVENTS = 2000;

const action: ActionDefinition = {
  key: "event-import",
  type: "perform",
  resource: "event",
  title: "Import events",
  description:
    "Write events through the authenticated import endpoint. Every event needs an `$insert_id`, " +
    "which is what makes a retry safe — and what /track cannot offer.",
  idempotent: true,
  params: [
    {
      key: "events",
      label: "Events",
      type: "json",
      required: true,
      default: "",
      hint: 'Array of `{"event":"Signed Up","properties":{"time":1755000000000,' +
        '"distinct_id":"u1","$insert_id":"…"}}`. Up to 2000 per call, 10 MB total.',
    },
    {
      key: "strict",
      label: "Strict Validation",
      type: "boolean",
      default: true,
      hint: "On, Mixpanel validates every record and reports the bad ones. Off, malformed " +
        "events are silently dropped — which is how data quietly goes missing.",
    },
  ],
  output: [
    { key: "code", type: "number", label: "Code" },
    { key: "num_records_imported", type: "number", label: "Records imported" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const events = json(p.events, "events");
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error("`events` must be a non-empty array");
    }
    if (events.length > MAX_EVENTS) {
      throw new Error(
        `Mixpanel accepts at most ${MAX_EVENTS} events per import; got ${events.length}`,
      );
    }

    // Every required field checked here rather than at Mixpanel, because a
    // partial import is much harder to reason about than a refused one.
    for (const [i, e] of events.entries()) {
      const event = e as { event?: unknown; properties?: Record<string, unknown> };
      if (!event?.event) throw new Error(`event at index ${i} has no \`event\` name`);
      const props = event.properties ?? {};
      if (props.time === undefined) {
        throw new Error(
          `event at index ${i} has no \`properties.time\` — Mixpanel will not infer it`,
        );
      }
      if (!props.distinct_id && !props.$user_id && !props.$device_id) {
        throw new Error(`event at index ${i} has no \`properties.distinct_id\``);
      }
      if (!props.$insert_id) {
        throw new Error(
          `event at index ${i} has no \`properties.$insert_id\` — without one a retry of this ` +
            "workflow double-counts, since that field is what Mixpanel deduplicates on",
        );
      }
    }

    ctx.log("info", "importing Mixpanel events", { count: events.length });
    return await new MixpanelClient(ctx).request("/import", {
      plane: "ingest",
      method: "POST",
      query: { strict: p.strict === false ? "0" : "1" },
      body: events,
    });
  },
};

export default action;
