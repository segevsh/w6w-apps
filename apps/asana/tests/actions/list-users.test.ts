import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-users.ts";

test("list-users: GETs /workspaces/{workspace}/users", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ workspace: "ws-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/workspaces/ws-1/users");
  assertEquals(calls[0].method, "GET");
});

test("list-users: forwards opt_fields when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ workspace: "ws-1", opt_fields: "gid,name" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("opt_fields"), "gid,name");
});

test("list-users: omits opt_fields when undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ workspace: "ws-1" }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("opt_fields"));
});
