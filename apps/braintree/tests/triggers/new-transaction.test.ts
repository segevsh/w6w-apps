import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-transaction.ts";

const response = (id: string) => ({
  body: { data: { transactions: { edges: [{ node: { id } }], pageInfo: {} } } },
});

test("new-transaction seeds, emits, retries, and posts the bounded transaction search", async () => {
  const seed = await trigger.poll!({ params: {}, state: {} }, mockCtx([response("a")]).ctx);
  assertEquals(seed.events, []);
  const nextCtx = mockCtx([{
    body: {
      data: {
        transactions: { edges: [{ node: { id: "b" } }, { node: { id: "a" } }], pageInfo: {} },
      },
    },
  }]);
  const next = await trigger.poll!({ params: {}, state: seed.nextState }, nextCtx.ctx);
  assertEquals(next.events, [{ id: "b" }]);
  const retry = await trigger.poll!(
    { params: {}, state: seed.nextState },
    mockCtx([{
      body: {
        data: {
          transactions: { edges: [{ node: { id: "b" } }, { node: { id: "a" } }], pageInfo: {} },
        },
      },
    }]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(nextCtx.calls[0].url, "https://payments.braintree-api.com/graphql");
  assertEquals(JSON.parse(nextCtx.calls[0].body!).variables, { input: {}, first: 100 });
});
