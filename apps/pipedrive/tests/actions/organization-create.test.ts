import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-create.ts";

test("organization-create: POSTs /organizations", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 1 } } }]);
  await action.execute!({ name: "Acme", ownerId: 4 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/organizations");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme", owner_id: 4 });
});
