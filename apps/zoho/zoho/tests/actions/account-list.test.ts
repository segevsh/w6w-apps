import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/account-list.ts";

Deno.test("account-list: GETs /Accounts with the field list", async () => {
  const { ctx, calls } = mockZohoCtx([{ body: { data: [{ id: "1" }] } }]);
  await action.execute({ fields: "id,Account_Name", page: 1, per_page: 200 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/crm/v6/Accounts");
  assertEquals(url.searchParams.get("fields"), "id,Account_Name");
});
