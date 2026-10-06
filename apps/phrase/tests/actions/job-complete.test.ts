import { assert, assertEquals, assertRejects } from "@std/assert";
import jobComplete from "../../actions/job-complete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-complete: sends POST /v2/projects/project%201%2Fx/jobs/job%201%2Fx/complete", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "jobId": "job 1/x",
    "branch": "v_branch",
  };
  const out = await jobComplete.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/jobs/job%201%2Fx/complete");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "branch": "v_branch" });
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("job-complete: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await jobComplete.execute({
      "projectId": "project 1/x",
      "jobId": "job 1/x",
      "branch": "v_branch",
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("job-complete: declares key, type and every param it reads", () => {
  assertEquals(jobComplete.key, "job-complete");
  assertEquals(jobComplete.type, "perform");
  const declared = new Set((jobComplete.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "jobId": "job 1/x",
      "branch": "v_branch",
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
