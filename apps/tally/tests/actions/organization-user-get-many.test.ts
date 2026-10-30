import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-user-get-many.ts";

test("organization-user-get-many: GETs the members as a bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "u1" }, { id: "u2" }] }]);
  const result = await action.execute({ organizationId: "org1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/organizations/org1/users");
  assertEquals(result.count, 2);
});

test("organization-user-get-many: tolerates a non-array body", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await action.execute({ organizationId: "org1" }, ctx), { items: [], count: 0 });
});
