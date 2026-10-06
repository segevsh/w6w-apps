import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/web-search.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("web-search: calls web/search with the nested input and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      cost: "0.002",
      provider: "linkup",
      feature: "web",
      subfeature: "search",
      output: { query: "eden ai", results: [{ url: "https://e" }], answer: "A" },
    },
  }]);
  const out = await action.execute({
    query: "eden ai",
    maxResults: 3,
    depth: "deep",
    provider: "linkup",
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai");
  assertEquals(calls[0].method, "POST");
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "web/search/linkup");
  assertEquals(body.input, { query: "eden ai", max_results: 3, depth: "deep" });
  assertEquals(out.provider, "linkup");
  assertEquals(out.cost, 0.002);
  assertEquals(out.output, { query: "eden ai", results: [{ url: "https://e" }], answer: "A" });
});

Deno.test("web-search: a provider failure inside a 200 is thrown", async () => {
  const { ctx } = mockCtx([{
    body: { status: "fail", provider: "linkup", error: { message: "provider down" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute(
        { query: "eden ai", maxResults: 3, depth: "deep", provider: "linkup" },
        ctx,
      ),
    Error,
    "provider down",
  );
});

Deno.test("web-search: fallbacks and a provider model reach the request", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", output: {} } }]);
  await action.execute({
    ...{ query: "eden ai", maxResults: 3, depth: "deep", provider: "linkup" },
    provider: "openai/gpt-4o",
    fallbacks: "a, b",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "web/search/openai/gpt-4o");
  assertEquals(body.fallbacks, ["a", "b"]);
});
