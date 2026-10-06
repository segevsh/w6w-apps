import { assert, assertEquals } from "@std/assert";
import search from "../../actions/search.ts";
import { errorBody, mockCtx, pathOf, rejection } from "../_helpers.ts";

Deno.test("search: posts compacted snake_case body to /search", async () => {
  const { ctx, calls } = mockCtx([{ body: { query: "q", results: [], images: [] } }]);
  const out = await search.execute({
    query: "q",
    searchDepth: "advanced",
    maxResults: 3,
    includeAnswer: "basic",
    includeRawContent: "",
    includeDomains: "a.com, b.com\nc.com",
    timeRange: "",
  }, ctx) as { query: string };
  assertEquals(out.query, "q");
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/search");
  assertEquals(JSON.parse(calls[0].body!), {
    query: "q",
    search_depth: "advanced",
    max_results: 3,
    include_answer: "basic",
    include_domains: ["a.com", "b.com", "c.com"],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign");
});

Deno.test("search: 432 surfaces the plan-limit message", async () => {
  const { ctx } = mockCtx([{
    status: 432,
    body: errorBody("This request exceeds your plan's limit"),
  }]);
  const err = await rejection(() => search.execute({ query: "q" }, ctx));
  assert(err.message.includes("432"));
  assert(err.message.includes("exceeds your plan"));
});

Deno.test("search: 422 array detail is rendered as loc and msg", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { detail: [{ loc: ["body", "query"], msg: "Input should be a valid string" }] },
  }]);
  const err = await rejection(() => search.execute({ query: "q" }, ctx));
  assert(err.message.includes("body.query: Input should be a valid string"));
});
