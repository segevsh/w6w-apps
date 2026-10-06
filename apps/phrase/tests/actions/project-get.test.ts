import { assert, assertEquals, assertRejects } from "@std/assert";
import projectGet from "../../actions/project-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-get: sends GET /v2/projects/project%201%2Fx", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
  };
  const out = await projectGet.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("project-get: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await projectGet.execute({
      "projectId": "project 1/x",
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("project-get: declares key, type and every param it reads", () => {
  assertEquals(projectGet.key, "project-get");
  assertEquals(projectGet.type, "read");
  const declared = new Set((projectGet.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
