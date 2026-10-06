import { assertEquals } from "@std/assert";
import action from "../../actions/contact-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-get: GETs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact_id: 5, firstname: "Ada" } }]);
  const out = await action.execute!({ contactId: 5 }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/contacts/5");
  assertEquals(out, { contact_id: 5, firstname: "Ada" });
});
