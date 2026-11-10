import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, queryOf } from "../_helpers.ts";
import trigger from "../../triggers/new-event.ts";

const page = (data: unknown[]) => ({ body: { data } });

test("new-event seeds, emits once, retries idempotently, and requests newest events", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([page([{ id: "a" }])]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const next = page([{ id: "b" }, { id: "a" }]);
  const first = mockCtx([next]);
  const emitted = await trigger.poll!({ params: {}, state: seeded.nextState }, first.ctx);
  assertEquals(emitted.events, [{ id: "b" }]);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(
    new URL(first.calls[0].url).origin + new URL(first.calls[0].url).pathname,
    "https://api.datadoghq.com/api/v2/events",
  );
  assertEquals(queryOf(first.calls[0].url), { sort: "-timestamp", "page[limit]": "100" });
  assertEquals(
    await trigger.poll!({ params: {}, state: seeded.nextState }, mockCtx([next]).ctx),
    emitted,
  );
});

test("new-event passes the search query through", async () => {
  const m = mockCtx([page([])]);
  await trigger.poll!({ params: { query: "source:jenkins status:error" }, state: {} }, m.ctx);
  assertEquals(queryOf(m.calls[0].url), {
    "filter[query]": "source:jenkins status:error",
    sort: "-timestamp",
    "page[limit]": "100",
  });
});
