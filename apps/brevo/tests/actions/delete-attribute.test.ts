import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-attribute.ts";

test("delete-attribute: DELETEs /contacts/attributes/{category}/{name}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ category: "normal", name: "FIRSTNAME" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts/attributes/normal/FIRSTNAME");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});
