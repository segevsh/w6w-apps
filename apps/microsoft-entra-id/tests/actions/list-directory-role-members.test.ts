import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-directory-role-members.ts";

Deno.test("list-directory-role-members: GETs /directoryRoles/{id}/members by object id", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "u1" }] } }]);
  const out = await action.execute({ roleId: "r1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/directoryRoles/r1/members");
  assertEquals(out.value.length, 1);
});

Deno.test("list-directory-role-members: addresses a role by roleTemplateId with the documented form", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute(
    { roleId: "62e90394-69f5-4237-9190-012177145e10", idType: "roleTemplateId" },
    ctx,
  );
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/directoryRoles(roleTemplateId='62e90394-69f5-4237-9190-012177145e10')/members",
  );
});

Deno.test("list-directory-role-members: requires a role", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ roleId: " " }, ctx),
    Error,
    "Role is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("list-directory-role-members: supports only $select — no $top", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ roleId: "r1", select: ["id", "displayName"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "id,displayName");
  assert(!action.params!.some((p) => p.key === "top"));
});
