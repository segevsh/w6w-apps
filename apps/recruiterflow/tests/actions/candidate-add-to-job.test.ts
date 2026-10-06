import { assertEquals } from "@std/assert";
import candidateAddToJob from "../../actions/candidate-add-to-job.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-add-to-job: POST /candidate/add-to-job with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await candidateAddToJob.execute(
    { "id": 42, "jobId": 7, "applied": true } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/candidate/add-to-job");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "id": 42, "job_id": 7, "applied": 1 });
  assertEquals((out.data as { id: number }).id, 1);
});

Deno.test("candidate-add-to-job: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await candidateAddToJob.execute({ "id": 42, "jobId": 7, "applied": true } as never, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
