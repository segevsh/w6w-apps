import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("contact-delete: DELETEs /v1/contacts/{id} and reports deleted:true on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await contactDelete.execute({ id: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/c1");
  assertEquals(out, { deleted: true });
});

test("contact-delete: is an idempotent perform action", () => {
  assertEquals(contactDelete.type, "perform");
  assertEquals(contactDelete.idempotent, true);
});
