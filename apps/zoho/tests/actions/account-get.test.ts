import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

Deno.test("account-get: GETs /Accounts/{id} and unwraps the single record", async () => {
  const { ctx, calls } = mockZohoCtx([{ body: { data: [{ id: "1", Account_Name: "Acme" }] } }]);
  const out = await action.execute({ recordId: "1", fields: "id,Account_Name" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v6/Accounts/1");
  assertEquals(out, { id: "1", Account_Name: "Acme" });
});
