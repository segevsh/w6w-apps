import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-list.ts";

/** WorkOS has no "all events" — a caller has to name the types it wants. */
Deno.test("event-list: refuses an empty event-type list, explaining why", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ events: "" }, ctx),
    Error,
    "no 'all events'",
  );
  assertEquals(calls.length, 0);
});

Deno.test("event-list: sends repeated event keys and returns the resume cursor", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "event_1" }, { id: "event_2" }], list_metadata: { after: null } },
  }]);
  const result = await action.execute!(
    { events: "dsync.user.created,dsync.user.deleted" },
    ctx,
  ) as { count: number; lastEventId: string };
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("events"), ["dsync.user.created", "dsync.user.deleted"]);
  assertEquals(q.get("limit"), "100");
  assertEquals(result.count, 2);
  assertEquals(result.lastEventId, "event_2");
});

Deno.test("event-list: resuming from a cursor drops the range start", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], list_metadata: {} } }]);
  await action.execute!({ events: "a.b", after: "event_9" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("after"), "event_9");
  assertEquals(q.get("range_start"), null);
});

Deno.test("event-list: a first run may use a range start instead", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], list_metadata: {} } }]);
  await action.execute!({ events: "a.b", rangeStart: "2026-08-01T00:00:00Z" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("range_start"), "2026-08-01T00:00:00Z");
});

/** WorkOS rejects the pair, so this refuses before spending the request. */
Deno.test("event-list: a cursor and a range start together are refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!({ events: "a.b", after: "e1", rangeStart: "2026-08-01" }, ctx),
    Error,
    "either",
  );
  assertEquals(calls.length, 0);
});

Deno.test("event-list: follows the cursor and stops at the page ceiling", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "e1" }], list_metadata: { after: "e1" } } },
    { status: 200, body: { data: [{ id: "e2" }], list_metadata: { after: "e2" } } },
  ]);
  const result = await action.execute!({ events: "a.b", maxPages: 2 }, ctx) as {
    count: number;
    lastEventId: string;
  };
  assertEquals(calls.length, 2);
  assertEquals(result.count, 2);
  assertEquals(result.lastEventId, "e2");
});

/** An empty page keeps the caller's cursor, so the next run does not restart. */
Deno.test("event-list: no new events preserves the cursor it was given", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [], list_metadata: { after: null } } }]);
  const result = await action.execute!({ events: "a.b", after: "event_9" }, ctx) as {
    lastEventId: string;
  };
  assertEquals(result.lastEventId, "event_9");
});

/** The distinction the whole app turns on. */
Deno.test("event-list: says in its description that a listing cannot see a deletion", () => {
  assert(/DELETION/i.test(action.description!), action.description);
});
