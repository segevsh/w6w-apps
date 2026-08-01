import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tweet-search-recent.ts";

Deno.test("tweet-search-recent: GETs /tweets/search/recent with the query and max_results", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "1" }], meta: { result_count: 1 } } }]);
  const out = await action.execute({ query: "w6w", maxResults: 25 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.x.com/2/tweets/search/recent?query=w6w&max_results=25",
  );
  assertEquals(out, { data: [{ id: "1" }], meta: { result_count: 1 } });
});

Deno.test("tweet-search-recent: omits blank optional fields from the query", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ query: "w6w" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("start_time"), false);
  assertEquals(url.searchParams.has("end_time"), false);
});
