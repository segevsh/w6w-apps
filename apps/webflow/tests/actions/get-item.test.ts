import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-item.ts";

Deno.test("get-item: GETs /v2/collections/{id}/items/{itemId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "i1" } }]);
  await action.execute!({ collectionId: "c1", itemId: "i1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/collections/c1/items/i1");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-item: forwards cmsLocaleId as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ collectionId: "c1", itemId: "i1", cmsLocaleId: "loc1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("cmsLocaleId"), "loc1");
});
