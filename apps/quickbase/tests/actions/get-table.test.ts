import { assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/get-table.ts";

Deno.test("get-table: sends both the table path segment and the appId query", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { id: "bck1", name: "Customers" } }]);
  const out = await action.execute({ tableId: "bck1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/tables/bck1");
  assertEquals(url.searchParams.get("appId"), "bqrapp1");
  assertEquals(out.name, "Customers");
});

Deno.test("get-table: encodes an awkward table id", async () => {
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute({ tableId: "a b/c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/tables/a%20b%2Fc");
});
