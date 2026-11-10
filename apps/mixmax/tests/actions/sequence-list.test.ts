import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/sequence-list.ts";
import { mockCtx } from "../_helpers.ts";

test("sequence-list: GET /sequences?name=Sales&expand=stages", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ _id: "s1" }] } }]);
  const out = await action.execute!({ name: "Sales", expandStages: true } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/sequences?name=Sales&expand=stages");
  assertEquals(calls[0].body, null);
  assertEquals(out, { results: [{ _id: "s1" }] });
});

test("sequence-list: limit and next are sent; the page cursor is returned", async () => {
  const { ctx, calls } = mockCtx([{
    body: { results: [{ _id: "s1" }], next: "c1", hasNext: true },
  }]);
  const out = await action.execute!({ limit: 100, next: "c0" } as never, ctx);
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/sequences?limit=100&next=c0");
  assertEquals(out, { results: [{ _id: "s1" }], next: "c1", hasNext: true });
});
