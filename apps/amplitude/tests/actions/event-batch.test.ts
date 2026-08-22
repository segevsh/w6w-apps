import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok, partial } from "./_shared.ts";
import action from "../../actions/event-batch.ts";

const accepted = ok({ code: 200, events_ingested: 2 });
const event = { user_id: "user-1071", event_type: "Historic Import" };

/** Same payload, different queue — /batch is the bulk-loading endpoint. */
Deno.test("event-batch: posts to /batch rather than /2/httpapi", async () => {
  const { ctx, calls } = mockCtx([accepted], { display });
  await action.execute!({ events: JSON.stringify([event, event]) }, ctx);
  assertEquals(calls[0].url, "https://api2.amplitude.com/batch");
});

Deno.test("event-batch: derives stable insert_ids, which matters most in a backfill", async () => {
  const first = mockCtx([accepted], { display });
  await action.execute!({ events: JSON.stringify([event]) }, first.ctx);
  const second = mockCtx([accepted], { display });
  await action.execute!({ events: JSON.stringify([event]) }, second.ctx);
  assertEquals(
    JSON.parse(first.calls[0].body!).events[0].insert_id,
    JSON.parse(second.calls[0].body!).events[0].insert_id,
  );
});

Deno.test("event-batch: short ids are refused, naming the backfill consequence", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () =>
      await action.execute!({ events: JSON.stringify([{ user_id: "42", event_type: "a" }]) }, ctx),
    Error,
  );
  assert(/load as\s+anonymous/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("event-batch: minIdLength allows them and is sent as an option", async () => {
  const { ctx, calls } = mockCtx([accepted], { display });
  await action.execute!({
    events: JSON.stringify([{ user_id: "42", event_type: "a" }]),
    minIdLength: 1,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).options, { min_id_length: 1 });
});

Deno.test("event-batch: a partial failure reports the indexes", async () => {
  const { ctx } = mockCtx([partial({ code: 400, throttled_events: [0] })], { display });
  const result = await action.execute!({ events: JSON.stringify([event, event]) }, ctx) as {
    partial: boolean;
    rejectedIndexes: number[];
  };
  assertEquals(result.partial, true);
  assertEquals(result.rejectedIndexes, [0]);
});

Deno.test("event-batch: the 2000 ceiling is enforced", async () => {
  const many = JSON.stringify(Array.from({ length: 2001 }, () => event));
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ events: many }, ctx),
    Error,
    "at most 2000",
  );
  assertEquals(calls.length, 0);
});

Deno.test("event-batch: needs at least one event", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ events: "[]" }, ctx),
    Error,
    "at least one",
  );
});

/** The rule of thumb the two ingest actions exist to encode. */
Deno.test("event-batch: says when to use it instead of event-track", () => {
  assert(/Bulk-load/.test(action.title) || /bulk/i.test(action.description!), action.description);
  assert(/longer delay/.test(action.description!), action.description);
});
