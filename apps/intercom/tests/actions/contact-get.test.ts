import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "abc", email: "a@b.com" } }]);
  await action.execute!({ contactId: "abc" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/contacts/abc");
  assertEquals(calls[0].method, "GET");
});

Deno.test("contact-get: url-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ contactId: "a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/contacts/a%2Fb%20c");
});
