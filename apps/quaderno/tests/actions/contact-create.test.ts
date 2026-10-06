import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ status: 201, body: { id: 5 } }]);
  const out = await action.execute({ firstName: "Jo", email: "jo@x.io", phone: "" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/contacts");
  // Blank form fields are dropped, not sent as empty strings.
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Jo", email: "jo@x.io" });
  assertEquals(out, { id: 5 });
});
