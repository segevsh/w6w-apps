import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("contact-delete: DELETEs /api/contacts/{id}, reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await contactDelete.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/contacts/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});
