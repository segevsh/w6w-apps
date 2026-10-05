import { assertEquals, assertRejects } from "@std/assert";
import workspaceMemberAdd from "../../actions/workspace-member-add.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "workspaceId": "x-workspaceId",
  "userId": "x-userId",
  "include": ["user", "contact"],
};

Deno.test("workspace-member-add: sends PUT /workspaces/{id}/members/{user_id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await workspaceMemberAdd.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/x-workspaceId/members/x-userId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { "include": ["user", "contact"] });
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("workspace-member-add: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceMemberAdd.execute(
    { "workspaceId": "x-workspaceId", "userId": "x-userId" } as never,
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("workspace-member-add: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceMemberAdd.execute({ ...INPUT, ...{ "workspaceId": "a/b", "userId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("workspace-member-add: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await workspaceMemberAdd.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
