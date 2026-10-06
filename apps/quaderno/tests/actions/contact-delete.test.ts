import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

Deno.test("contact-delete: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ status: 204 }]);
  const out = await action.execute({ contactId: 7 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/contacts/7");
  assertEquals(out, { deleted: true, id: 7 });
});
