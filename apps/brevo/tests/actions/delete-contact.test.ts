import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-contact.ts";

test("delete-contact: DELETEs /v3/contacts/{id} and returns success:true", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ identifier: "1234" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts/1234");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});
