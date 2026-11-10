import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-customer.ts";

const input = { params: { businessId: "b1" }, subscriptionId: "sub-1" };
const node = (id: string, modifiedAt = "2026-11-09T10:00:00Z") => ({ id, name: id, modifiedAt });
const ctx = (nodes: unknown[]) =>
  mockCtx([{
    body: {
      data: { business: { customers: { pageInfo: {}, edges: nodes.map((n) => ({ node: n })) } } },
    },
  }]);

test("new-or-updated-customer: seeds, emits only new customers, retries idempotently", async () => {
  const s = await trigger.poll!({ ...input, state: {} }, ctx([node("a")]).ctx);
  assertEquals(s.events, []);
  assertEquals((s.nextState as { seeded: boolean }).seeded, true);
  const later = { ...input, state: s.nextState };
  const first = await trigger.poll!(later, ctx([node("b"), node("a")]).ctx);
  assertEquals(first.events, [node("b")]);
  assertEquals(await trigger.poll!(later, ctx([node("b"), node("a")]).ctx), first);
});

test("new-or-updated-customer: an edited known customer is a new event", async () => {
  const s = await trigger.poll!({ ...input, state: {} }, ctx([node("a")]).ctx);
  const edited = node("a", "2026-11-09T12:00:00Z");
  const r = await trigger.poll!({ ...input, state: s.nextState }, ctx([edited]).ctx);
  assertEquals(r.events, [edited]);
});

test("new-or-updated-customer: sends the MODIFIED_AT_DESC sort, page 1, pageSize 100", async () => {
  const seed = ctx([node("a")]);
  await trigger.poll!({ ...input, state: {} }, seed.ctx);
  const body = JSON.parse(seed.calls[0].body!);
  assertEquals(body.variables, {
    businessId: "b1",
    page: 1,
    pageSize: 100,
    sort: ["MODIFIED_AT_DESC"],
  });
});
