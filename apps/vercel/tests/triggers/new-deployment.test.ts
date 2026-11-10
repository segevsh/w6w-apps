import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-deployment.ts";
const input = { params: {}, subscriptionId: "sub-1" };
const item = (uid: string) => ({ uid });
const ctx = (deployments: unknown[]) => mockCtx([{ body: { deployments, pagination: {} } }]);
test("new-deployment seeds, emits, retries, and calls the deployments endpoint", async () => {
  const seed = ctx([item("a")]);
  const s = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(s.events, []);
  assertEquals((s.nextState as { seeded: boolean }).seeded, true);
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url: "https://api.vercel.com/v7/deployments?limit=100",
  });
  const n = await trigger.poll!({ ...input, state: s.nextState }, ctx([item("b"), item("a")]).ctx);
  assertEquals(n.events, [item("b")]);
  assertEquals(
    await trigger.poll!({ ...input, state: s.nextState }, ctx([item("b"), item("a")]).ctx),
    n,
  );
});
