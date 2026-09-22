import { assertEquals } from "@std/assert";
import contactTagRemove from "../../actions/contact-tag-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-tag-remove: DELETEs /contacts/{contact_id}/tags/{tag_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await contactTagRemove.execute({ contactId: 3, tagId: 5 }, ctx) as unknown[];

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/contacts/3/tags/5");
  assertEquals(out, []);
});

Deno.test("contact-tag-remove: is safe to retry", () => {
  assertEquals(contactTagRemove.idempotent, true);
});
