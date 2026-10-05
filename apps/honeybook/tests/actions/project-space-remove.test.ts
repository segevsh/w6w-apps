import { assertEquals, assertRejects } from "@std/assert";
import projectSpaceRemove from "../../actions/project-space-remove.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "projectId": "x-projectId", "spaceId": "x-spaceId" };

Deno.test("project-space-remove: sends DELETE /projects/{id}/spaces/{space_id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await projectSpaceRemove.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/x-projectId/spaces/x-spaceId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
});

Deno.test("project-space-remove: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await projectSpaceRemove.execute(
    { "projectId": "x-projectId", "spaceId": "x-spaceId" } as never,
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("project-space-remove: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await projectSpaceRemove.execute({ ...INPUT, ...{ "projectId": "a/b", "spaceId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("project-space-remove: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectSpaceRemove.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
