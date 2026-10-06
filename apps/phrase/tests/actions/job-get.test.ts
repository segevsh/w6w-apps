import { assert, assertEquals, assertRejects } from "@std/assert";
import jobGet from "../../actions/job-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-get: sends GET /v2/projects/project%201%2Fx/jobs/job%201%2Fx", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "jobId": "job 1/x",
    "branch": "v_branch",
    "omitTranslationKeys": true,
  };
  const out = await jobGet.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/jobs/job%201%2Fx");
  assertEquals(queryOf(calls[0].url), { "branch": "v_branch", "omit_translation_keys": "true" });
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("job-get: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await jobGet.execute({
      "projectId": "project 1/x",
      "jobId": "job 1/x",
      "branch": "v_branch",
      "omitTranslationKeys": true,
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("job-get: declares key, type and every param it reads", () => {
  assertEquals(jobGet.key, "job-get");
  assertEquals(jobGet.type, "read");
  const declared = new Set((jobGet.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "jobId": "job 1/x",
      "branch": "v_branch",
      "omitTranslationKeys": true,
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
