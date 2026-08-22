import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-search.ts";

const D = { display: { host: "https://search.internal:8108" } };
const base = { collection: "products", q: "boots", queryBy: "name, description" };
const result = (found: number) => ({
  status: 200,
  body: {
    found,
    out_of: 5000,
    search_time_ms: 3,
    hits: Array.from({ length: Math.min(found, 10) }, (_, i) => ({
      document: { id: String(i), name: "boot" },
      text_match: 100,
    })),
  },
});

Deno.test("document-search: sends q and query_by, and returns the documents", async () => {
  const { ctx, calls } = mockCtx([result(42)], D);
  const output = await action.execute(base, ctx) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/collections/products/documents/search");
  assertEquals(url.searchParams.get("q"), "boots");
  assertEquals(url.searchParams.get("query_by"), "name,description");
  assertEquals(output.found, 42);
  assertEquals(output.returned, 10);
});

/**
 * The behaviour this app exists to surface: below ten hits Typesense drops
 * query words, and nothing in the response says so.
 */
Deno.test("document-search: strict turns off both widening thresholds", async () => {
  const loose = mockCtx([result(42)], D);
  await action.execute(base, loose.ctx);
  const loosely = new URL(loose.calls[0].url).searchParams;
  assertEquals(loosely.get("drop_tokens_threshold"), null, "Typesense's own default is left alone");
  assertEquals(loosely.get("num_typos"), "2");

  const strict = mockCtx([result(42)], D);
  await action.execute({ ...base, strict: true }, strict.ctx);
  const strictly = new URL(strict.calls[0].url).searchParams;
  assertEquals(strictly.get("drop_tokens_threshold"), "0");
  assertEquals(strictly.get("typo_tokens_threshold"), "0");
  assertEquals(strictly.get("num_typos"), "0");
});

Deno.test("document-search: a thin non-strict result is flagged as possibly widened", async () => {
  const thin = mockCtx([result(4)], D);
  const output = await action.execute(base, thin.ctx) as Record<string, unknown>;
  assertEquals(output.mayHaveBeenWidened, true);
  assert(
    thin.logs.some((l) => /dropping query words/.test(l.message)),
    JSON.stringify(thin.logs),
  );

  const wide = mockCtx([result(50)], D);
  const many = await action.execute(base, wide.ctx) as Record<string, unknown>;
  assertEquals(many.mayHaveBeenWidened, false);
});

Deno.test("document-search: a strict thin result is not flagged", async () => {
  const { ctx, logs } = mockCtx([result(2)], D);
  const output = await action.execute({ ...base, strict: true }, ctx) as Record<string, unknown>;
  assertEquals(output.mayHaveBeenWidened, false);
  assert(!logs.some((l) => /dropping query words/.test(l.message)), JSON.stringify(logs));
});

/** Only the fields named are searched. */
Deno.test("document-search: refuses without query_by, and says what happens without it", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ ...base, queryBy: "" }, ctx),
    Error,
  );
  assert(/returns an empty result with no error/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("document-search: refuses without q, and points at the star", async () => {
  const { ctx } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ ...base, q: "" }, ctx),
    Error,
  );
  assert(/use `\*` to match everything/.test(err.message), err.message);
});

Deno.test("document-search: filters, sorts, facets and paging reach the query", async () => {
  const { ctx, calls } = mockCtx([result(1)], D);
  await action.execute({
    ...base,
    filterBy: "in_stock:true",
    sortBy: "price:asc",
    facetBy: "brand, size",
    perPage: 25,
    page: 3,
    includeFields: "id, name",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("filter_by"), "in_stock:true");
  assertEquals(q.get("sort_by"), "price:asc");
  assertEquals(q.get("facet_by"), "brand,size");
  assertEquals(q.get("per_page"), "25");
  assertEquals(q.get("page"), "3");
  assertEquals(q.get("include_fields"), "id,name");
});

Deno.test("document-search: per_page is clamped to what Typesense accepts", async () => {
  const { ctx, calls } = mockCtx([result(1)], D);
  await action.execute({ ...base, perPage: 9999 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("per_page"), "250");
});

/** The documents are the customer's data. */
Deno.test("document-search: logs counts, never the documents", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { found: 1, hits: [{ document: { id: "1", email: "ada@example.com" } }] },
  }], D);
  await action.execute(base, ctx);
  const data = JSON.stringify(logs.map((l) => l.data));
  assert(/found/.test(data), data);
  assert(!/ada@example\.com/.test(data), data);
});
