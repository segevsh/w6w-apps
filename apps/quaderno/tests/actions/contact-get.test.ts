import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

test("contact-get: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ body: { id: 4, first_name: "Jo" } }]);
  const out = await action.execute({ contactId: 4 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/contacts/4");
  assertEquals(out, { id: 4, first_name: "Jo" });
});
