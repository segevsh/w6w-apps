import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/user-delete.ts";

test("user-delete: DELETEs the user", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { user: { id: 3 } } }]);
  await action.execute({ userId: 3 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/users/3.json");
});
