import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deal-get-many.ts";

Deno.test("deal-get-many: GETs /deals with filter query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: [] } }]);
  await action.execute!({ status: "open", filterId: 5, limit: 50, start: 0 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/deals");
  assertEquals(url.searchParams.get("status"), "open");
  assertEquals(url.searchParams.get("filter_id"), "5");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("start"), "0");
});
