import { assertEquals } from "@std/assert";
import assignContactTag from "../../actions/assign-contact-tag.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("assign-contact-tag: PUT .../assign_tag/{tag} with the tag URL-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  const out = await assignContactTag.execute({ contactId: "c1", tagName: "VIP / gold" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/contacts/c1/assign_tag/VIP%20%2F%20gold");
  assertEquals(calls[0].body, null);
  assertEquals(out, { assigned: true });
});
