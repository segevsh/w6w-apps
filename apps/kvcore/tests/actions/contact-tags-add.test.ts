import { assertEquals } from "@std/assert";
import contactTagsAdd from "../../actions/contact-tags-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-tags-add: PUTs {tags: [{name, locked: 0}]}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { contact_id: 1, tags: [{ name: "hotlead", locked: 0 }] },
  }]);
  await contactTagsAdd.execute({ contact_id: "1", tags: ["hotlead"] }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/public/contact/1/tags");
  assertEquals(JSON.parse(calls[0].body!), { tags: [{ name: "hotlead", locked: 0 }] });
});

Deno.test("contact-tags-add: multiple tags all default to unlocked", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactTagsAdd.execute({ contact_id: "1", tags: ["a", "b"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).tags, [{ name: "a", locked: 0 }, {
    name: "b",
    locked: 0,
  }]);
});
