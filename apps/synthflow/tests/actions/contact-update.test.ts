import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PATCH sends only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok" } }]);
  const out = await contactUpdate.execute({ contact_id: "ct1", email: "a@b.co" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/contacts/ct1");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.co" });
  // A body with no `response` member is returned as is.
  assertEquals(out, { status: "ok" });
});
