import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-user-remove.ts";

test("organization-user-remove: DELETEs the member and handles the empty 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ organizationId: "org1", userId: "u1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/organizations/org1/users/u1");
  assertEquals(result, { userId: "u1", removed: true });
});

test("organization-user-remove: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
