import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-contact.ts";

test("delete-contact: DELETEs /crm/v3/objects/contacts/{id} and returns confirmation", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ id: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/contacts/1");
  assertEquals(out, { id: "1", deleted: true });
});
