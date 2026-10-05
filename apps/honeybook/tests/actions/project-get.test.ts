import { assertEquals, assertRejects } from "@std/assert";
import projectGet from "../../actions/project-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "projectId": "x-projectId",
  "include": ["workspaces", "custom_fields"],
  "maxWorkspaces": 5,
  "maxCustomFields": 5,
};

Deno.test("project-get: sends GET /projects/{id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await projectGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/x-projectId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {
    "include": "workspaces,custom_fields",
    "max_workspaces": "5",
    "max_custom_fields": "5",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("project-get: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectGet.execute({ "projectId": "x-projectId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("project-get: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectGet.execute({ ...INPUT, ...{ "projectId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("project-get: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectGet.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
