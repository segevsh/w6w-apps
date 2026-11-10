import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-sender-identity.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const response = (ids: string[]) => ({ data: ids.map((id) => ({ id })) });
const ctx = (ids: string[]) => mockCtx([{ body: response(ids) }]);

test("new-sender-identity: seeds, emits only new items, retries idempotently, and requests its feed", async () => {
  const seed = ctx(["a"]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const request = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    path: request.pathname,
    query: Object.fromEntries(request.searchParams),
  }, {
    method: "GET",
    path: "/v1/identities",
    query: { order_by: "created_at", order: "desc", page: "1", limit: "100" },
  });
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(["b", "a"]).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(["b", "a"]).ctx);
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});
