import { assert, assertEquals, assertRejects } from "@std/assert";
import projectUpdate from "../../actions/project-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-update: sends PATCH /v2/projects/project%201%2Fx", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "name": "v_name",
    "mainFormat": "v_mainFormat",
    "enableBranching": true,
    "enableIcuMessageFormat": true,
  };
  const out = await projectUpdate.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "v_name",
    "main_format": "v_mainFormat",
    "enable_branching": true,
    "enable_icu_message_format": true,
  });
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("project-update: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await projectUpdate.execute({
      "projectId": "project 1/x",
      "name": "v_name",
      "mainFormat": "v_mainFormat",
      "enableBranching": true,
      "enableIcuMessageFormat": true,
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("project-update: declares key, type and every param it reads", () => {
  assertEquals(projectUpdate.key, "project-update");
  assertEquals(projectUpdate.type, "perform");
  const declared = new Set((projectUpdate.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "name": "v_name",
      "mainFormat": "v_mainFormat",
      "enableBranching": true,
      "enableIcuMessageFormat": true,
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
