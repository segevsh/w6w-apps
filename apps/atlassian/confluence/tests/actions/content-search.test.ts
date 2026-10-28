import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/content-search.ts";

const display = { site: "acme" };

/**
 * The one v1 endpoint that carries its weight: v2 publishes no search at all,
 * so CQL is only reachable there.
 */
Deno.test("content-search: calls v1, because v2 has no search endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [], totalSize: 0 } }], {
    display,
  });
  await action.execute!({ cql: 'type = page AND text ~ "onboarding"' }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wiki/rest/api/search");
  assertEquals(url.searchParams.get("cql"), 'type = page AND text ~ "onboarding"');
});

Deno.test("content-search: pages with v1's start/limit offsets, not v2's cursor", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], { display });
  await action.execute!({ cql: "type = page", limit: 10, start: 20, excerpt: "highlight" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("limit"), "10");
  assertEquals(q.get("start"), "20");
  assertEquals(q.get("cursor"), null);
  assertEquals(q.get("excerpt"), "highlight");
});

Deno.test("content-search: is typed as a search action and needs a query", async () => {
  assertEquals(action.type, "search");
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({ cql: " " }, ctx), Error, "`cql`");
  assertEquals(calls.length, 0);
});
