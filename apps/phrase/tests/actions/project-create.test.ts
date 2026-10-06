import { assert, assertEquals, assertRejects } from "@std/assert";
import projectCreate from "../../actions/project-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-create: sends POST /v2/projects", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "name": "v_name",
    "accountId": "v_accountId",
    "mainFormat": "v_mainFormat",
    "sourceProjectId": "v_sourceProjectId",
    "enableBranching": true,
    "enableIcuMessageFormat": true,
  };
  const out = await projectCreate.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/projects");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "v_name",
    "account_id": "v_accountId",
    "main_format": "v_mainFormat",
    "source_project_id": "v_sourceProjectId",
    "enable_branching": true,
    "enable_icu_message_format": true,
  });
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("project-create: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await projectCreate.execute({
      "name": "v_name",
      "accountId": "v_accountId",
      "mainFormat": "v_mainFormat",
      "sourceProjectId": "v_sourceProjectId",
      "enableBranching": true,
      "enableIcuMessageFormat": true,
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("project-create: declares key, type and every param it reads", () => {
  assertEquals(projectCreate.key, "project-create");
  assertEquals(projectCreate.type, "perform");
  const declared = new Set((projectCreate.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "name": "v_name",
      "accountId": "v_accountId",
      "mainFormat": "v_mainFormat",
      "sourceProjectId": "v_sourceProjectId",
      "enableBranching": true,
      "enableIcuMessageFormat": true,
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
