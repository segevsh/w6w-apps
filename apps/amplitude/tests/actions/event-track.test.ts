import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok, partial } from "./_shared.ts";
import action from "../../actions/event-track.ts";

const accepted = ok({ code: 200, events_ingested: 1, payload_size_bytes: 100 });
const event = { user_id: "user-1071", event_type: "Checkout Completed" };

Deno.test("event-track: posts events to the ingest host", async () => {
  const { ctx, calls } = mockCtx([accepted], { display });
  const result = await action.execute!({ events: JSON.stringify([event]) }, ctx) as {
    ingested: number;
    sent: number;
  };
  assertEquals(calls[0].url, "https://api2.amplitude.com/2/httpapi");
  assertEquals(result.sent, 1);
  assertEquals(result.ingested, 1);
});

/**
 * Amplitude removes ids under five characters and ingests the event anonymously
 * — a 200 with `events_ingested: 1` and no user attached.
 */
Deno.test("event-track: a short id is refused, and the error explains what would happen", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () =>
      await action.execute!({
        events: JSON.stringify([{ user_id: "42", event_type: "a" }]),
      }, ctx),
    Error,
  );
  assert(/does NOT reject these/.test(error.message), error.message);
  assert(/ingests the event anonymously/.test(error.message), error.message);
  assert(/user_id = "42"/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("event-track: minIdLength both allows short ids and tells Amplitude to keep them", async () => {
  const { ctx, calls } = mockCtx([accepted], { display });
  await action.execute!({
    events: JSON.stringify([{ user_id: "42", event_type: "a" }]),
    minIdLength: 2,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).options, { min_id_length: 2 });
});

/**
 * Deduplication keys on the id being identical across attempts, so a derived
 * one is what makes a retry safe.
 */
Deno.test("event-track: derives a stable insert_id, identical for an identical payload", async () => {
  const first = mockCtx([accepted], { display });
  await action.execute!({ events: JSON.stringify([event]) }, first.ctx);
  const second = mockCtx([accepted], { display });
  await action.execute!({ events: JSON.stringify([event]) }, second.ctx);

  const a = JSON.parse(first.calls[0].body!).events[0].insert_id;
  const b = JSON.parse(second.calls[0].body!).events[0].insert_id;
  assert(a, "no insert_id was derived");
  assertEquals(a, b, "a retry would not deduplicate");
});

Deno.test("event-track: a caller's own insert_id is left alone", async () => {
  const { ctx, calls } = mockCtx([accepted], { display });
  await action.execute!({
    events: JSON.stringify([{ ...event, insert_id: "mine" }]),
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).events[0].insert_id, "mine");
});

Deno.test("event-track: derivation can be turned off", async () => {
  const { ctx, calls } = mockCtx([accepted], { display });
  await action.execute!({ events: JSON.stringify([event]), deriveInsertId: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).events[0].insert_id, undefined);
});

/** A 400 naming indexes means some events landed; resending everything double-counts. */
Deno.test("event-track: a partial failure returns which events failed, by index", async () => {
  const { ctx, logs } = mockCtx([
    partial({ code: 400, events_with_missing_fields: { event_type: [1] } }),
  ], { display });
  const result = await action.execute!({
    events: JSON.stringify([event, { ...event, event_type: "b" }, { ...event, event_type: "c" }]),
  }, ctx) as { partial: boolean; rejectedIndexes: number[]; ingested: number };
  assertEquals(result.partial, true);
  assertEquals(result.rejectedIndexes, [1]);
  assertEquals(result.ingested, 2, "the other two landed");
  assertEquals(logs[0].level, "warn");
});

Deno.test("event-track: a whole-request failure still throws", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: 400, error: "Invalid API key: x" } }], {
    display,
  });
  await assertRejects(
    async () => await action.execute!({ events: JSON.stringify([event]) }, ctx),
    Error,
    "INGEST side",
  );
});

Deno.test("event-track: every event needs an event_type and an identifier", async () => {
  const noType = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({ events: JSON.stringify([{ user_id: "user-1" }]) }, noType.ctx),
    Error,
    "no `event_type`",
  );

  const noId = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ events: JSON.stringify([{ event_type: "a" }]) }, noId.ctx),
    Error,
    "neither `user_id` nor `device_id`",
  );
});

Deno.test("event-track: over 2000 events is refused with the count", async () => {
  const many = JSON.stringify(Array.from({ length: 2001 }, () => event));
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ events: many }, ctx),
    Error,
    "at most 2000",
  );
  assertEquals(calls.length, 0);
});

/** Event properties are the caller's data. */
Deno.test("event-track: logs counts, never the events", async () => {
  const { ctx, logs } = mockCtx([accepted], { display });
  await action.execute!({
    events: JSON.stringify([{ ...event, event_properties: { secret: "tuna" } }]),
  }, ctx);
  assert(!JSON.stringify(logs).includes("tuna"), JSON.stringify(logs));
  assertEquals(logs[0].data, { sent: 1, ingested: 1 });
});

Deno.test("event-track: names both silent behaviours in its description", () => {
  assert(/SILENTLY REMOVED/.test(action.description!), action.description);
  assert(/double-counts/.test(action.description!), action.description);
});
