import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: fetches /contact/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 123, email: "test@test.com" } }]);
  const out = await contactGet.execute({ contact_id: "123" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/public/contact/123");
  assertEquals(out, { id: 123, email: "test@test.com" });
});

Deno.test("contact-get: URL-encodes the contact id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactGet.execute({ contact_id: "abc/def" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/contact/abc%2Fdef");
});
