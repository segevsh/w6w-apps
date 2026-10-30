import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-update.ts";

test("user-update: PATCHes only the fields supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u-1" } }]);
  await action.execute!({ userKey: "u-1", suspended: true }, ctx);

  assertEquals(calls[0].method, "PATCH");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/users/u-1");
  assertEquals(JSON.parse(calls[0].body!), { suspended: true });
});

test("user-update: nests givenName/familyName under name", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ userKey: "u-1", givenName: "Grace" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: { givenName: "Grace" } });
});

test("user-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
