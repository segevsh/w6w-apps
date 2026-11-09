import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-group.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const group = (id: string) => ({ id, networkId: "net_123", name: `Group ${id}` });

test("new-group: seeds, emits additions, retries idempotently, and lists all groups", async () => {
  const seededCtx = mockCtx([{ body: [group("a")] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seededCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seededCtx.calls[0].method, "GET");
  assertEquals(seededCtx.calls[0].url, "https://api.folk.app/network/__network_id__/groups");

  const next = [group("a"), group("b")];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: next }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: next }]).ctx,
  );
  assertEquals(first.events, [{ change: "added", key: "b", values: group("b") }]);
  assertEquals(retry, first);
});
