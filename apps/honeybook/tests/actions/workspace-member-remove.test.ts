import { assertEquals, assertRejects } from "@std/assert";
import workspaceMemberRemove from "../../actions/workspace-member-remove.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "workspaceId": "x-workspaceId", "userId": "x-userId" };

Deno.test("workspace-member-remove: sends DELETE /workspaces/{id}/members/{user_id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await workspaceMemberRemove.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/x-workspaceId/members/x-userId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
});

Deno.test("workspace-member-remove: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await workspaceMemberRemove.execute(
    { "workspaceId": "x-workspaceId", "userId": "x-userId" } as never,
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("workspace-member-remove: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await workspaceMemberRemove.execute(
    { ...INPUT, ...{ "workspaceId": "a/b", "userId": "a/b" } },
    ctx,
  );
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("workspace-member-remove: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await workspaceMemberRemove.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
