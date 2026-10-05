import { assertEquals, assertRejects } from "@std/assert";
import workspaceTagRemove from "../../actions/workspace-tag-remove.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "workspaceId": "x-workspaceId", "tagId": "x-tagId" };

Deno.test("workspace-tag-remove: sends DELETE /workspaces/{id}/tags/{tag_id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await workspaceTagRemove.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/x-workspaceId/tags/x-tagId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
});

Deno.test("workspace-tag-remove: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await workspaceTagRemove.execute(
    { "workspaceId": "x-workspaceId", "tagId": "x-tagId" } as never,
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("workspace-tag-remove: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await workspaceTagRemove.execute({ ...INPUT, ...{ "workspaceId": "a/b", "tagId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("workspace-tag-remove: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await workspaceTagRemove.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
