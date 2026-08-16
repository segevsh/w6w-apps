import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/web-search.ts";

Deno.test("web-search: POSTs /search with the query only", async () => {
  const body = { id: "search-1", results: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ query: "latest AI developments" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { query: "latest AI developments" });
  assertEquals(result, body);
});

Deno.test("web-search: accepts an array query for multi-query search", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ query: ["AI news", "AI funding"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).query, ["AI news", "AI funding"]);
});

Deno.test("web-search: forwards optional params with snake_case keys", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      query: "x",
      maxResults: 5,
      searchDomainFilter: ["wikipedia.org"],
      searchLanguageFilter: ["en"],
      country: "US",
      searchContextSize: "high",
      searchRecencyFilter: "day",
      searchAfterDateFilter: "1/1/2026",
      searchBeforeDateFilter: "12/31/2026",
      lastUpdatedAfterFilter: "1/1/2026",
      lastUpdatedBeforeFilter: "12/31/2026",
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.max_results, 5);
  assertEquals(sent.search_domain_filter, ["wikipedia.org"]);
  assertEquals(sent.search_language_filter, ["en"]);
  assertEquals(sent.country, "US");
  assertEquals(sent.search_context_size, "high");
  assertEquals(sent.search_recency_filter, "day");
  assertEquals(sent.search_after_date_filter, "1/1/2026");
  assertEquals(sent.search_before_date_filter, "12/31/2026");
  assertEquals(sent.last_updated_after_filter, "1/1/2026");
  assertEquals(sent.last_updated_before_filter, "12/31/2026");
});

Deno.test("web-search: max_tokens and max_tokens_per_page are forwarded independently", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ query: "x", maxTokens: 5000, maxTokensPerPage: 500 }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.max_tokens, 5000);
  assertEquals(sent.max_tokens_per_page, 500);
  assertEquals("search_context_size" in sent, false);
});

Deno.test("web-search: omits undefined optional params and empty arrays from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ query: "x", searchDomainFilter: [] }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["query"]);
});
