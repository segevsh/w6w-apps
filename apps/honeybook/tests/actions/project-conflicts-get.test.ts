import { assertEquals, assertRejects } from "@std/assert";
import projectConflictsGet from "../../actions/project-conflicts-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "projectId": "x-projectId" };

Deno.test("project-conflicts-get: sends GET /projects/{id}/conflicts with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await projectConflictsGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/x-projectId/conflicts");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("project-conflicts-get: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectConflictsGet.execute({ "projectId": "x-projectId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("project-conflicts-get: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectConflictsGet.execute({ ...INPUT, ...{ "projectId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("project-conflicts-get: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectConflictsGet.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
