import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactRestore from "../../actions/contact-restore.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("contact-restore: PATCHes /contacts/{id}/restore", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await contactRestore.execute({ id: "1" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/1/restore");
});
