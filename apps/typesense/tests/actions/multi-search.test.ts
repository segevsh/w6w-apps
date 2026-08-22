import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/multi-search.ts";

const D = { display: { host: "https://search.internal:8108" } };
const searches = JSON.stringify([
  { collection: "products", q: "boots", query_by: "name" },
  { collection: "articles", q: "boots", query_by: "title" },
]);

Deno.test("multi-search: posts the searches and totals what they found", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { results: [{ found: 12, hits: [] }, { found: 3, hits: [] }] },
  }], D);
  const result = await action.execute({ searches }, ctx) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, "/multi_search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!).searches.length, 2);
  assertEquals(result.count, 2);
  assertEquals(result.totalFound, 15);
  assertEquals(result.foundPerSearch, [12, 3]);
  assertEquals(result.allSucceeded, true);
});

/** A 200 can carry a failed search, and burying it is how it gets missed. */
Deno.test("multi-search: surfaces a search that failed inside a 200", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: {
      results: [
        { found: 12, hits: [] },
        {
          code: 404,
          error: "Not found.",
          request_params: { collection_name: "articles" },
        },
      ],
    },
  }], D);
  const result = await action.execute({ searches }, ctx) as Record<string, unknown>;
  assertEquals(result.allSucceeded, false);
  assertEquals((result.errors as Array<{ collection: string }>)[0].collection, "articles");
  assert(
    logs.some((l) => l.level === "warn" && /says nothing about the searches/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("multi-search: shared parameters go in the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], D);
  await action.execute({ searches, commonQueryBy: "name", commonFilterBy: "in_stock:true" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("query_by"), "name");
  assertEquals(q.get("filter_by"), "in_stock:true");
});

Deno.test("multi-search: every search needs a collection and a q", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ searches: '[{"collection":"products"},{"q":"x"}]' }, ctx),
    Error,
  );
  assert(/these do not: 0, 1/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("multi-search: refuses an empty or non-array searches value", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ searches: "[]" }, ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    async () => await action.execute({ searches: '{"collection":"x"}' }, ctx),
    Error,
    "non-empty",
  );
});
