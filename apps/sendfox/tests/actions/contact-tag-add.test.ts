import { assertEquals } from "@std/assert";
import contactTagAdd from "../../actions/contact-tag-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-tag-add: POSTs to /contacts/{contact_id}/tags/{tag_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 5, name: "vip" }] }]);
  const out = await contactTagAdd.execute({ contactId: 3, tagId: 5 }, ctx) as unknown[];

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/contacts/3/tags/5");
  assertEquals(calls[0].body, null);
  assertEquals(out.length, 1);
});

Deno.test("contact-tag-add: is marked idempotent, as the vendor documents", () => {
  assertEquals(contactTagAdd.idempotent, true);
});
