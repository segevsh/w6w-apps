import { assertEquals, assertRejects } from "@std/assert";
import projectWorkspaceCreate from "../../actions/project-workspace-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "projectId": "x-projectId", "kind": "general" };

Deno.test("project-workspace-create: sends POST /projects/{id}/workspaces with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "r1", marker: "m" } }]);
  const out = await projectWorkspaceCreate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/x-projectId/workspaces");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { "kind": "general" });
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("project-workspace-create: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "r1", marker: "m" } }]);
  await projectWorkspaceCreate.execute({ "projectId": "x-projectId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("project-workspace-create: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "r1", marker: "m" } }]);
  await projectWorkspaceCreate.execute({ ...INPUT, ...{ "projectId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("project-workspace-create: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectWorkspaceCreate.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
