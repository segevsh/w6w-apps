import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: calls GET /contacts/{id} and returns the bare entity", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, email: "reader@example.com" } }]);
  const out = await contactGet.execute({ id: 9 }, ctx) as { email: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/contacts/9");
  assertEquals(out.email, "reader@example.com");
});

Deno.test("contact-get: a slash pasted into the id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await contactGet.execute({ id: "9/../../me" as unknown as number }, ctx);
  assertEquals(pathOf(calls[0].url), "/contacts/9%2F..%2F..%2Fme");
});
