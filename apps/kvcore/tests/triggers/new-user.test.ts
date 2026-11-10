import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-user.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id });
const response = (items: unknown[]) => ({ data: items });

test("new-user: seeds, emits new items, retries idempotently, and requests its sorted feed", async () => {
  const seed = mockCtx([{ body: response([item("a")]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url.includes("/"), true);

  const page = [item("b"), item("a")];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: response(page) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: response(page) }]).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
