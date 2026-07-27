import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PUTs /contacts/{id} with only supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "abc", type: "contact" } }]);
  await action.execute!({ contactId: "abc", name: "New Name", email: "" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/contacts/abc");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "New Name" });
});
