import { assertEquals } from "@std/assert";
import candidateMoveToStage from "../../actions/candidate-move-to-stage.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-move-to-stage: POST /candidate/move-to-stage with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await candidateMoveToStage.execute(
    { "id": 42, "stageName": "Interview", "jobId": 7, "userId": 3 } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/candidate/move-to-stage");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "id": 42,
    "stage": { "name": "Interview" },
    "job_id": 7,
    "user_id": 3,
  });
  assertEquals((out.data as { id: number }).id, 1);
});

Deno.test("candidate-move-to-stage: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await candidateMoveToStage.execute(
      { "id": 42, "stageName": "Interview", "jobId": 7, "userId": 3 } as never,
      ctx,
    );
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
