import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import purchaseGet from "../../actions/purchase-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("purchase-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await purchaseGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/purchases/7");
});

test("purchase-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await purchaseGet.execute({ id: "7", fields: "created_at" }, ctx);
  assertEquals(queryOf(calls[0])["fields[purchases]"], "created_at");
});

test("purchase-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await purchaseGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/purchases/a%2Fb");
});
