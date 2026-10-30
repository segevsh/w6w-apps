import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("contact-delete: DELETEs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await contactDelete.execute({ id: 27074 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/27074");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});
