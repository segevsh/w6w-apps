import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-list-item.ts";

const PARAMS = { listId: "list" };

test("new-list-item seeds without emitting, then emits an unseen list item", async () => {
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "old" }] } },
    { body: { value: [{ id: "new" }, { id: "old" }] } },
  ]);
  const seeded = await trigger.poll!({ params: PARAMS, state: {}, subscriptionId: "sub" }, ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState?.seeded, true);
  const next = await trigger.poll!({
    params: PARAMS,
    state: seeded.nextState!,
    subscriptionId: "sub",
  }, ctx);
  assertEquals(next.events, [{ id: "new" }]);
  assertEquals(calls[0], {
    method: "GET",
    url:
      "https://graph.microsoft.com/v1.0/sites/root/lists/list/items?%24expand=fields&%24orderby=createdDateTime+desc&%24top=100",
    headers: {},
    body: null,
  });
});

test("new-list-item is idempotent for the same cursor and response", async () => {
  const state = { v: 1 as const, kind: "ids" as const, seeded: true as const, ids: ["old"] };
  const page = { body: { value: [{ id: "new" }, { id: "old" }] } };
  const one = await trigger.poll!(
    { params: PARAMS, state, subscriptionId: "sub" },
    mockCtx([page]).ctx,
  );
  const two = await trigger.poll!(
    { params: PARAMS, state, subscriptionId: "sub" },
    mockCtx([page]).ctx,
  );
  assertEquals(one, two);
});
