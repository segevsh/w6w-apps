import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-add.ts";

const display = { appId: "APPID" };

Deno.test("object-add: POSTs to the index root, letting Algolia mint the ID", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { objectID: "gen", taskID: 1 } }], {
    display,
  });
  await action.execute!({ indexName: "products", record: '{"name":"Shoe"}' }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://appid.algolia.net/1/indexes/products");
});

Deno.test("object-add: is honestly non-idempotent — a retry can duplicate", () => {
  assertEquals(action.idempotent, false);
});
