import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-members.ts";

Deno.test("list-members: GETs spaces/{space}/members", async () => {
  const { ctx, calls } = mockCtx([{ body: { memberships: [] } }]);
  await action.execute!({ space: "A1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/members");
});

Deno.test("list-members: passes filter, showGroups, showInvited and paging through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    space: "spaces/A1",
    filter: 'member.type = "HUMAN"',
    showGroups: true,
    showInvited: true,
    pageSize: 200,
    pageToken: "tok",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("filter"), 'member.type = "HUMAN"');
  assertEquals(p.get("showGroups"), "true");
  assertEquals(p.get("showInvited"), "true");
  assertEquals(p.get("pageSize"), "200");
  assertEquals(p.get("pageToken"), "tok");
});

Deno.test("list-members: never sends useAdminAccess — this app holds no admin scope", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", showInvited: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("useAdminAccess"), false);
});
