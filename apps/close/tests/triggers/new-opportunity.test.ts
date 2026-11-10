import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-opportunity.ts";

const page = (data: unknown[]) => ({ body: { data, has_more: false } });

test("new-opportunity seeds, emits once, retries idempotently, and requests newest opportunities", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([page([{ id: "oppo_a" }])]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);

  const next = page([{ id: "oppo_b" }, { id: "oppo_a" }]);
  const first = mockCtx([next]);
  const emitted = await trigger.poll!({ params: {}, state: seeded.nextState }, first.ctx);
  assertEquals(emitted.events, [{ id: "oppo_b" }]);
  assertEquals({
    method: first.calls[0].method,
    path: new URL(first.calls[0].url).pathname,
    query: Object.fromEntries(new URL(first.calls[0].url).searchParams),
  }, {
    method: "GET",
    path: "/api/v1/opportunity/",
    query: { _limit: "100", _order_by: "-date_created", _skip: "0" },
  });
  assertEquals(
    await trigger.poll!({ params: {}, state: seeded.nextState }, mockCtx([next]).ctx),
    emitted,
  );
});
