import { assertEquals, assertRejects } from "@std/assert";
import batchCreate from "../../actions/batch-create.ts";
import { bodyOf, envelope, mockCtx, obj, pathOf } from "../_helpers.ts";

Deno.test("batch-create: splits lines, parses defaults, POSTs /screenshot/batch", async () => {
  const data = { batchId: "b1", totalJobs: 2, jobs: [] };
  const { ctx, calls } = mockCtx([{ status: 202, body: envelope(data) }]);
  const out = await obj(
    await batchCreate.execute({
      urls: "https://a.com\n https://b.com \n",
      defaults: '{"format":"png"}',
      webhookUrl: "https://hook.example/done",
      cacheTtl: 3600,
    }, ctx),
  );
  assertEquals(pathOf(calls[0].url), "/v1/screenshot/batch");
  assertEquals(bodyOf(calls[0]), {
    urls: ["https://a.com", "https://b.com"],
    defaults: { format: "png" },
    webhookUrl: "https://hook.example/done",
    cacheTtl: 3600,
  });
  assertEquals(out.batchId, "b1");
});

Deno.test("batch-create: accepts a JSON array string; rejects an empty list", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: envelope({ batchId: "b" }) }]);
  await batchCreate.execute({ urls: '["https://a.com","https://b.com"]' }, ctx);
  assertEquals(bodyOf(calls[0]).urls, ["https://a.com", "https://b.com"]);
  await assertRejects(
    async () => await batchCreate.execute({ urls: " " }, ctx),
    Error,
    "URLs is required",
  );
});
