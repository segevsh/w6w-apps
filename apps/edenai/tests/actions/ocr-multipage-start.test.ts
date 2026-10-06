import { assertEquals } from "@std/assert";
import start from "../../actions/ocr-multipage-start.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ocr-multipage-start: starts an async OCR job and returns the job id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: {
      status: "processing",
      cost: "0",
      provider: "amazon",
      feature: "ocr",
      subfeature: "ocr_async",
      public_id: "job-1",
      created_at: "2026-10-06T00:00:00Z",
    },
  }]);
  const out = await start.execute({
    file: "https://x/a.pdf",
    provider: "amazon",
    webhookReceiver: "https://hooks.example/h",
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai/async");
  assertEquals(bodyOf(calls[0]), {
    model: "ocr/ocr_async/amazon",
    input: { file: "https://x/a.pdf" },
    webhook_receiver: "https://hooks.example/h",
  });
  assertEquals(out.jobId, "job-1");
  assertEquals(out.status, "processing");
  assertEquals(out.subfeature, "ocr_async");
});
