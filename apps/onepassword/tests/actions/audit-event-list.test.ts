import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ok } from "./_shared.ts";
import action from "../../actions/audit-event-list.ts";

const events = ok({
  items: [
    { action: "create", object_type: "user", actor_uuid: "a1" },
    { action: "grant", object_type: "vault", actor_uuid: "a2" },
    { action: "create", object_type: "sa", actor_uuid: "a1" },
  ],
  cursor: "c1",
  has_more: true,
});

Deno.test("audit-event-list: posts to the Events host and summarises the actions", async () => {
  const { ctx, calls } = mockCtx([events], { display: eventsDisplay });
  const result = await action.execute!({ startTime: "2026-08-18T00:00:00Z" }, ctx) as {
    count: number;
    actions: string[];
  };
  assertEquals(calls[0].url, "https://events.1password.com/api/v2/auditevents");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.count, 3);
  assertEquals(result.actions.sort(), ["create", "grant"]);
});

/**
 * The cursor is always present, so paging until it is absent never terminates.
 * `has_more` is the only usable stop condition.
 */
Deno.test("audit-event-list: hasMore comes from has_more, not from the cursor existing", async () => {
  const more = mockCtx([events], { display: eventsDisplay });
  const withMore = await action.execute!({}, more.ctx) as { hasMore: boolean; cursor: string };
  assertEquals(withMore.hasMore, true);
  assertEquals(withMore.cursor, "c1");

  const last = mockCtx([ok({ items: [], cursor: "c2", has_more: false })], {
    display: eventsDisplay,
  });
  const atEnd = await action.execute!({}, last.ctx) as { hasMore: boolean; cursor: string };
  assertEquals(atEnd.hasMore, false);
  assertEquals(atEnd.cursor, "c2", "the cursor is still there, which is the trap");
});

/** A cursor request carries nothing else — the cursor encodes the filter. */
Deno.test("audit-event-list: a continuation sends the cursor alone", async () => {
  const { ctx, calls } = mockCtx([events], { display: eventsDisplay });
  await action.execute!({ cursor: "c1", startTime: "2026-08-18T00:00:00Z", limit: 50 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { cursor: "c1" });
});

Deno.test("audit-event-list: a starting query sends the window and a limit", async () => {
  const { ctx, calls } = mockCtx([events], { display: eventsDisplay });
  await action.execute!({
    startTime: "2026-08-18T00:00:00Z",
    endTime: "2026-08-19T00:00:00Z",
    limit: 50,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    limit: 50,
    start_time: "2026-08-18T00:00:00Z",
    end_time: "2026-08-19T00:00:00Z",
  });
});

/** With no window at all the API has to be told where to begin. */
Deno.test("audit-event-list: no window at all resets the cursor", async () => {
  const { ctx, calls } = mockCtx([events], { display: eventsDisplay });
  await action.execute!({}, ctx);
  assertEquals(JSON.parse(calls[0].body!).reset_cursor, true);
});

Deno.test("audit-event-list: the limit is clamped", async () => {
  const { ctx, calls } = mockCtx([events], { display: eventsDisplay });
  await action.execute!({ limit: 9999 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).limit, 1000);
});

/** A Connect connection cannot reach the Events API. */
Deno.test("audit-event-list: a Connect connection is refused before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "**Events**");
  assertEquals(calls.length, 0);
});

Deno.test("audit-event-list: logs a count", async () => {
  const { ctx, logs } = mockCtx([events], { display: eventsDisplay });
  await action.execute!({}, ctx);
  assertEquals(logs[0].data, { count: 3 });
});

/** Events name uuids rather than people, which is what makes them forwardable. */
Deno.test("audit-event-list: says why the stream is safe to forward", () => {
  assert(/name uuids rather than people/.test(action.description!), action.description);
});
