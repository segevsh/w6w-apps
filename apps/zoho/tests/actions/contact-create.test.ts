import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs the fields wrapped in a data array", async () => {
  const { ctx, calls } = mockZohoCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({ fields: { Last_Name: "Jones", Email: "a@acme.com" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v6/Contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { data: [{ Last_Name: "Jones", Email: "a@acme.com" }] });
});
