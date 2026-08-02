import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/deal-get.ts";

Deno.test("deal-get: GETs /Deals/{id} and unwraps the single record", async () => {
  const { ctx, calls } = mockZohoCtx([{ body: { data: [{ id: "1", Deal_Name: "Acme deal" }] } }]);
  const out = await action.execute({ recordId: "1", fields: "id,Deal_Name" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v6/Deals/1");
  assertEquals(out, { id: "1", Deal_Name: "Acme deal" });
});
