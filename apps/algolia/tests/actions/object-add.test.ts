import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-add.ts";

const display = { appId: "APPID" };

test("object-add: POSTs to the index root, letting Algolia mint the ID", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { objectID: "gen", taskID: 1 } }], {
    display,
  });
  await action.execute!({ indexName: "products", record: '{"name":"Shoe"}' }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://appid.algolia.net/1/indexes/products");
});

test("object-add: is honestly non-idempotent — a retry can duplicate", () => {
  assertEquals(action.idempotent, false);
});
