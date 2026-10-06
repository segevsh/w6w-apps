import { assertEquals } from "@std/assert";
import get from "../../actions/async-job-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("async-job-get: a successful job is done with its output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      cost: "0.5",
      provider: "amazon",
      feature: "ocr",
      subfeature: "ocr_async",
      output: { raw_text: "x" },
      public_id: "job-1",
      created_at: "t",
    },
  }]);
  const out = await get.execute({ jobId: "job-1", compact: true }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai/async/job-1");
  assertEquals(queryOf(calls[0].url), { output_format: "compact" });
  assertEquals(out.done, true);
  assertEquals(out.failed, false);
  assertEquals(out.output, { raw_text: "x" });
  assertEquals(out.cost, 0.5);
});

Deno.test("async-job-get: a processing job is not done and carries no output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "processing", public_id: "job-1", output: null },
  }]);
  const out = await get.execute({ jobId: "job-1" }, ctx) as Record<string, unknown>;
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.done, false);
  assertEquals(out.output, undefined);
});

Deno.test("async-job-get: a failed job is returned as failed, not thrown", async () => {
  const { ctx } = mockCtx([{
    body: { status: "fail", error: { message: "bad file" }, public_id: "job-1" },
  }]);
  const out = await get.execute({ jobId: "job-1" }, ctx) as Record<string, unknown>;
  assertEquals(out.done, true);
  assertEquals(out.failed, true);
  assertEquals(out.error, { message: "bad file" });
});
