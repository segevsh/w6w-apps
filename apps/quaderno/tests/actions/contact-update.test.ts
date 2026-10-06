import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ body: { id: 5, email: "new@x.io" } }]);
  const out = await action.execute({ contactId: 5, email: "new@x.io" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/contacts/5");
  assertEquals(JSON.parse(calls[0].body!), { email: "new@x.io" });
  assertEquals(out, { id: 5, email: "new@x.io" });
});
