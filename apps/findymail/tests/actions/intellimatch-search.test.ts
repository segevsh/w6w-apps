import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/intellimatch-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("intellimatch-search: sends the query alone when no option is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "hash": "abc" } }]);
  const out = await action.execute!({ "query": "B2B SaaS in France" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "query": "B2B SaaS in France",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "hash": "abc" });
});

Deno.test("intellimatch-search: nests the enrichment options under config", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "hash": "h" } }]);
  const out = await action.execute!(
    {
      "query": "q",
      "limit": 50,
      "find_contact": true,
      "find_email": true,
      "target_job_titles": '[["CEO"],["CTO"]]',
      "exclusion_filter_list_ids": "0, 4",
      "mode": "targeted",
    } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "query": "q",
    "limit": 50,
    "config": {
      "find_contact": true,
      "find_email": true,
      "target_job_titles": [["CEO"], ["CTO"]],
      "mode": "targeted",
      "exclusion_filter_list_ids": [0, 4],
    },
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "hash": "h" });
});

Deno.test("intellimatch-search: surfaces a 429 rate limit", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { "message": "Too Many Attempts." } }]);
  const err = await assertRejects(async () =>
    await action.execute!({ "query": "q" } as never, ctx)
  );
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 429"), msg);
  assert(msg.includes("Too Many Attempts."), msg);
});
