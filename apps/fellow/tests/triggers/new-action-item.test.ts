import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-action-item.ts";

const page = (data: unknown[]) => ({
  body: { action_items: { data, page_info: { cursor: null, page_size: 50 } } },
});

test("new-action-item seeds, emits unseen items, retries idempotently, and requests newest first", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} } as never,
    mockCtx([page([{ id: "a" }])]).ctx,
  ) as never as { events: unknown[]; nextState: unknown };
  assertEquals(seeded.events, []);
  const nextCtx = mockCtx([page([{ id: "b" }, { id: "a" }])]);
  const next = await trigger.poll!({ params: {}, state: seeded.nextState } as never, nextCtx.ctx);
  assertEquals((next as never as { events: unknown[] }).events, [{ id: "b" }]);
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockCtx([page([{ id: "b" }, { id: "a" }])]).ctx,
  );
  assertEquals(retry, next);
  assertEquals({ path: new URL(nextCtx.calls[0].url).pathname, body: nextCtx.calls[0].body }, {
    path: "/api/v1/action_items",
    body: '{"pagination":{"page_size":50},"order_by":"created_at_desc"}',
  });
});
