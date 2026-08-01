import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /contacts/:id", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: { id: 4, name: "Jo" } }]);
  const out = await action.execute({ contactId: 4 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/contacts/4");
  assertEquals(out, { id: 4, name: "Jo" });
});
