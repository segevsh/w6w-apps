import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-flow.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const flow = (ns: string, name = ns) => ({ ns, name });
const ctx = (flows: unknown[]) => mockCtx([{ body: { status: "success", data: { flows } } }]);

test("new-flow: seeds, emits only added flows, retries idempotently, requests getFlows", async () => {
  const seed = ctx([flow("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const request = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    path: request.pathname,
    query: Object.fromEntries(request.searchParams),
  }, { method: "GET", path: "/fb/page/getFlows", query: {} });

  const later = { ...input, state: seeded.nextState };
  const first = await trigger.poll!(later, ctx([flow("b"), flow("a")]).ctx);
  const retry = await trigger.poll!(later, ctx([flow("b"), flow("a")]).ctx);
  assertEquals(first.events, [flow("b")]);
  assertEquals(retry, first);
});

test("new-flow: a renamed or removed flow is not a new flow", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([flow("a"), flow("z")]).ctx);
  const res = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([flow("a", "renamed")]).ctx,
  );
  assertEquals(res.events, []);
});

test("new-flow: more than 200 flows do not re-emit the overflow on later checks", async () => {
  const many = Array.from({ length: 250 }, (_, i) => flow(`f${i}`));
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx(many).ctx);
  const again = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(many).ctx);
  assertEquals(again.events, []);
});
