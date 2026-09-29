import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-get: fetches GET /contacts/:id with an optional include header", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact: { id: 5, full_name: "Margaret Smith" } } }]);
  const out = await contactGet.execute({ contactId: 5, include: "addresses,phones" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/contacts/5");
  assertEquals(calls[0].headers["include"], "addresses,phones");
  assertEquals(out.contact.full_name, "Margaret Smith");
});

Deno.test("contact-get: is a read action", () => {
  assertEquals(contactGet.type, "read");
});
