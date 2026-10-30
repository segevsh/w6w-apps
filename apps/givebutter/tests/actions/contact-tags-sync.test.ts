import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactTagsSync from "../../actions/contact-tags-sync.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("contact-tags-sync: POSTs tags to /contacts/{id}/tags/sync", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await contactTagsSync.execute({ id: "1", tags: "vip,alumni" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/1/tags/sync");
  assertEquals(JSON.parse(calls[0].body!), { tags: ["vip", "alumni"] });
});
