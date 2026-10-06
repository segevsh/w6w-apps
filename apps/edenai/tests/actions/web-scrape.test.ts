import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/web-scrape.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("web-scrape: calls web/scraping with the nested input and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      cost: "0.002",
      provider: "firecrawl",
      feature: "web",
      subfeature: "scraping",
      output: { url: "https://example.com", content: "# Hi", title: "T" },
    },
  }]);
  const out = await action.execute(
    { url: "https://example.com", provider: "firecrawl" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai");
  assertEquals(calls[0].method, "POST");
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "web/scraping/firecrawl");
  assertEquals(body.input, { url: "https://example.com" });
  assertEquals(out.provider, "firecrawl");
  assertEquals(out.cost, 0.002);
  assertEquals(out.output, { url: "https://example.com", content: "# Hi", title: "T" });
});

Deno.test("web-scrape: a provider failure inside a 200 is thrown", async () => {
  const { ctx } = mockCtx([{
    body: { status: "fail", provider: "firecrawl", error: { message: "provider down" } },
  }]);
  await assertRejects(
    async () => await action.execute({ url: "https://example.com", provider: "firecrawl" }, ctx),
    Error,
    "provider down",
  );
});

Deno.test("web-scrape: fallbacks and a provider model reach the request", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", output: {} } }]);
  await action.execute({
    ...{ url: "https://example.com", provider: "firecrawl" },
    provider: "openai/gpt-4o",
    fallbacks: "a, b",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "web/scraping/openai/gpt-4o");
  assertEquals(body.fallbacks, ["a", "b"]);
});
