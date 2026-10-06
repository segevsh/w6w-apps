import { assertEquals } from "@std/assert";
import jobGet from "../../actions/job-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-get: GET /job with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await jobGet.execute({ "jobId": 7, "includeStages": true } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/job");
  assertEquals(queryOf(calls[0].url), { "job_id": "7", "include_stages": "1" });
  assertEquals(calls[0].body, null);
  assertEquals((out.data as { id: number }).id, 1);
});

Deno.test("job-get: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await jobGet.execute({ "jobId": 7, "includeStages": true } as never, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
