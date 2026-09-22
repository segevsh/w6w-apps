import { assertEquals } from "@std/assert";
import contactUnsubscribe from "../../actions/contact-unsubscribe.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-unsubscribe: PATCHes the email to /unsubscribe", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2, email: "reader@example.com" } }]);
  const out = await contactUnsubscribe.execute({ email: "reader@example.com" }, ctx) as {
    id: number;
  };

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/unsubscribe");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { email: "reader@example.com" });
  assertEquals(out.id, 2);
});

Deno.test("contact-unsubscribe: is safe to retry", () => {
  assertEquals(contactUnsubscribe.idempotent, true);
});
