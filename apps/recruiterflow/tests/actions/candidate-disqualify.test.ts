import { assertEquals } from "@std/assert";
import candidateDisqualify from "../../actions/candidate-disqualify.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-disqualify: POST /candidate/disqualify with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await candidateDisqualify.execute(
    { "id": 42, "jobId": 7, "reason": "Not a fit" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/candidate/disqualify");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "id": 42,
    "job_id": 7,
    "reason": "Not a fit",
  });
  assertEquals((out.data as { id: number }).id, 1);
});

Deno.test("candidate-disqualify: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await candidateDisqualify.execute(
      { "id": 42, "jobId": 7, "reason": "Not a fit" } as never,
      ctx,
    );
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
