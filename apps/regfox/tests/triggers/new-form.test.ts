import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-form.ts";

const item = (id: number) => ({ id });
test("new-form seeds, emits new forms, retries, and requests descending forms", async () => {
  const seed = mockCtx([{ body: { data: [item(1)] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.webconnex.com/v2/public/forms?sort=desc&limit=50");
  const page = { data: [item(2), item(1)] };
  const first = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: page }]).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: page }]).ctx,
  );
  assertEquals(first.events, [item(2)]);
  assertEquals(retry, first);
});
