import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";

const input = { params: { businessId: "b1" }, subscriptionId: "sub-1" };
const node = (id: string) => ({ id, name: id, modifiedAt: "2026-11-09T10:00:00Z" });
const ctx = (ids: string[]) =>
  mockCtx([{
    body: {
      data: {
        business: { customers: { pageInfo: {}, edges: ids.map((i) => ({ node: node(i) })) } },
      },
    },
  }]);

test("new-customer: seeds, emits only new customers, retries idempotently", async () => {
  const s = await trigger.poll!({ ...input, state: {} }, ctx(["a"]).ctx);
  assertEquals(s.events, []);
  assertEquals((s.nextState as { seeded: boolean }).seeded, true);
  const later = { ...input, state: s.nextState };
  const first = await trigger.poll!(later, ctx(["b", "a"]).ctx);
  assertEquals(first.events, [node("b")]);
  assertEquals(await trigger.poll!(later, ctx(["b", "a"]).ctx), first);
});

test("new-customer: a modified known customer is not a new event", async () => {
  const s = await trigger.poll!({ ...input, state: {} }, ctx(["a"]).ctx);
  const edited = mockCtx([{
    body: {
      data: {
        business: {
          customers: {
            pageInfo: {},
            edges: [{ node: { ...node("a"), modifiedAt: "2026-11-09T11:00:00Z" } }],
          },
        },
      },
    },
  }]);
  const r = await trigger.poll!({ ...input, state: s.nextState }, edited.ctx);
  assertEquals(r.events, []);
});

test("new-customer: sends the CREATED_AT_DESC sort, page 1, pageSize 100", async () => {
  const seed = ctx(["a"]);
  await trigger.poll!({ ...input, state: {} }, seed.ctx);
  const body = JSON.parse(seed.calls[0].body!);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(body.variables, {
    businessId: "b1",
    page: 1,
    pageSize: 100,
    sort: ["CREATED_AT_DESC"],
  });
});
