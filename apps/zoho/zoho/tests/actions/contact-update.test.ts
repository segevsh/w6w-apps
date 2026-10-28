import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PUTs the id alongside the changed fields", async () => {
  const { ctx, calls } = mockZohoCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: {} }] } },
  ]);
  await action.execute({ recordId: "1", fields: { Phone: "+1 555 0100" } }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { data: [{ id: "1", Phone: "+1 555 0100" }] });
});
