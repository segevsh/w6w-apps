import { assertEquals, assertRejects } from "@std/assert";
import start from "../../actions/async-job-start.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("async-job-start: starts any async feature and returns the job id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: {
      status: "processing",
      provider: "firecrawl",
      feature: "web",
      subfeature: "crawl_async",
      public_id: "job-3",
      model: "web/crawl_async/firecrawl",
    },
  }]);
  const out = await start.execute({
    feature: "web",
    subfeature: "crawl_async",
    provider: "firecrawl",
    input: '{"url":"https://example.com"}',
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai/async");
  assertEquals(bodyOf(calls[0]), {
    model: "web/crawl_async/firecrawl",
    input: { url: "https://example.com" },
  });
  assertEquals(out.jobId, "job-3");
  assertEquals(out.model, "web/crawl_async/firecrawl");
});

Deno.test("async-job-start: input that is not a JSON object fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await start.execute({ feature: "f", subfeature: "s", provider: "p", input: "" }, ctx),
    Error,
    "JSON object",
  );
  assertEquals(calls.length, 0);
});
