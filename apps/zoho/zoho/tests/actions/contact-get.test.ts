import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /Contacts/{id} and unwraps the single record", async () => {
  const { ctx, calls } = mockZohoCtx([{ body: { data: [{ id: "1", Last_Name: "Jones" }] } }]);
  const out = await action.execute({ recordId: "1", fields: "id,Last_Name" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v6/Contacts/1");
  assertEquals(out, { id: "1", Last_Name: "Jones" });
});
