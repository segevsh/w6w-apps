import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-directory-roles.ts";

Deno.test("list-directory-roles: GETs /directoryRoles", async () => {
  const { ctx, calls } = mockCtx([{
    body: { value: [{ id: "r1", displayName: "User Administrator" }] },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/directoryRoles");
  assertEquals(out.value.length, 1);
});

Deno.test("list-directory-roles: passes $filter (eq) and $select; offers no $top", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ filter: "displayName eq 'User Administrator'", select: ["id"] }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("$filter"), "displayName eq 'User Administrator'");
  assertEquals(q.get("$select"), "id");
  assert(!action.params!.some((p) => p.key === "top"));
});

Deno.test("list-directory-roles: replays a nextLink verbatim", async () => {
  const link = "https://graph.microsoft.com/v1.0/directoryRoles?$skiptoken=1";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ nextLink: link, filter: "ignored" }, ctx);
  assertEquals(calls[0].url, link);
});

Deno.test("list-directory-roles: all=true walks pages", async () => {
  const next = "https://graph.microsoft.com/v1.0/directoryRoles?$skiptoken=1";
  const { ctx } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(out.value.length, 2);
});
