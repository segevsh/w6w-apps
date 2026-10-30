import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-insert.ts";

test("member-insert: POSTs /groups/{groupKey}/members with role defaulted to MEMBER", async () => {
  const body = { id: "m-1" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({
    groupKey: "team@example.com",
    email: "new@example.com",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/groups/team%40example.com/members");
  assertEquals(JSON.parse(calls[0].body!), { email: "new@example.com", role: "MEMBER" });
  assertEquals(result, body);
});

test("member-insert: forwards an explicit role", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ groupKey: "g-1", email: "boss@example.com", role: "OWNER" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).role, "OWNER");
});
