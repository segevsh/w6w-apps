import { assertEquals } from "@std/assert";
import contactTagsRemove from "../../actions/contact-tags-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The vendor's own prose ("An array of tag names to disassociate") describes
 * a bare JSON array body — unlike the sibling PUT, which wraps tags in an
 * object. This pins that asymmetry rather than "fixing" it to match the PUT.
 */
Deno.test("contact-tags-remove: DELETEs with a bare array body of tag names", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact_id: 1, tags: [] } }]);
  await contactTagsRemove.execute({ contact_id: "1", tags: ["hotlead", "stale"] }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/public/contact/1/tags");
  assertEquals(JSON.parse(calls[0].body!), ["hotlead", "stale"]);
});
