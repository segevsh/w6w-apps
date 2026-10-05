import { assertEquals, assertRejects } from "@std/assert";
import projectDateDelete from "../../actions/project-date-delete.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "projectId": "x-projectId", "dateId": "x-dateId" };

Deno.test("project-date-delete: sends DELETE /projects/{id}/dates/{date_id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await projectDateDelete.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/x-projectId/dates/x-dateId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
});

Deno.test("project-date-delete: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await projectDateDelete.execute(
    { "projectId": "x-projectId", "dateId": "x-dateId" } as never,
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("project-date-delete: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await projectDateDelete.execute({ ...INPUT, ...{ "projectId": "a/b", "dateId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("project-date-delete: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectDateDelete.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
