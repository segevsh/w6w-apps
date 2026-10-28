import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/deal-list.ts";

Deno.test("deal-list: GETs /Deals with the field list", async () => {
  const { ctx, calls } = mockZohoCtx([{ body: { data: [{ id: "1" }] } }]);
  await action.execute({ fields: "id,Deal_Name", page: 1, per_page: 200 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/crm/v6/Deals");
  assertEquals(url.searchParams.get("fields"), "id,Deal_Name");
});
