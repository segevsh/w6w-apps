import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-items.ts";

Deno.test("list-items: GETs /v2/collections/{id}/items with paging params", async () => {
  const body = { items: [], pagination: { total: 0 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ collectionId: "c1", limit: 25, offset: 50 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/collections/c1/items");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("offset"), "50");
  assertEquals(result, body);
});
