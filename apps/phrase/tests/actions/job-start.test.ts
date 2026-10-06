import { assert, assertEquals, assertRejects } from "@std/assert";
import jobStart from "../../actions/job-start.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-start: sends POST /v2/projects/project%201%2Fx/jobs/job%201%2Fx/start", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {
    "projectId": "project 1/x",
    "jobId": "job 1/x",
    "branch": "v_branch",
  };
  const out = await jobStart.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/projects/project%201%2Fx/jobs/job%201%2Fx/start");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "branch": "v_branch" });
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("job-start: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await jobStart.execute({
      "projectId": "project 1/x",
      "jobId": "job 1/x",
      "branch": "v_branch",
    }, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("job-start: declares key, type and every param it reads", () => {
  assertEquals(jobStart.key, "job-start");
  assertEquals(jobStart.type, "perform");
  const declared = new Set((jobStart.params ?? []).map((p) => p.key));
  for (
    const k of Object.keys({
      "projectId": "project 1/x",
      "jobId": "job 1/x",
      "branch": "v_branch",
    })
  ) assert(declared.has(k), `missing param ${k}`);
});
