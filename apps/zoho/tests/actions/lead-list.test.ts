import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/lead-list.ts";

Deno.test("lead-list: GETs /Leads with the field list and paging params", async () => {
  const { ctx, calls } = mockZohoCtx([{ body: { data: [{ id: "1" }], info: { count: 1 } } }]);
  const out = await action.execute({
    fields: "id,Last_Name",
    page: 2,
    per_page: 50,
    sort_by: "Created_Time",
    sort_order: "desc",
    converted: "false",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/crm/v6/Leads");
  assertEquals(url.searchParams.get("fields"), "id,Last_Name");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "50");
  assertEquals(url.searchParams.get("converted"), "false");
  assertEquals(out, { data: [{ id: "1" }], info: { count: 1 } });
});
