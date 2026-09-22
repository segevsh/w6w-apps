import { assert, assertEquals } from "@std/assert";
import searchRecords from "../../actions/search-records.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("search-records: POSTs /v2/search with the view in the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ job_id: 1010 }] }]);
  const result = await searchRecords.execute({
    searchView: "jobs",
    query: "job_status = 'In Play'",
    limit: 30,
  }, ctx) as { records: unknown[] };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/search");
  assertEquals(queryOf(calls[0].url), { search_view: "jobs" });
  assertEquals(bodyOf(calls[0]), { query: "job_status = 'In Play'", limit: 30 });
  assertEquals(result.records, [{ job_id: 1010 }]);
});

/** The vendor documents the language in prose, so the param carries it wordier. */
Deno.test("search-records: the filter language is documented on the query param", () => {
  const param = (searchRecords.params ?? []).find((p) => p.key === "query");
  assertEquals(param?.required, true);
  assertEquals(param?.type, "text");
  const hint = param?.hint ?? "";
  for (const operator of ["CONTAINS", "NOT IN", "AND", "OR"]) {
    assert(hint.includes(operator), operator);
  }
});

/**
 * `limit` defaults to Streamtime's maximum (1000), which the vendor itself warns
 * is the ceiling — above it the request errors. The app prefills 100 and says so.
 */
Deno.test("search-records: the limit is prefilled below the vendor's 1000 maximum", () => {
  const param = (searchRecords.params ?? []).find((p) => p.key === "limit");
  assertEquals(param?.default, 100);
  assertEquals(param?.validation, { integer: true, min: 0, max: 1000 });
});

Deno.test("search-records: additionalData is sent as an array when given", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await searchRecords.execute({
    searchView: "jobs",
    query: "job_id = 1",
    additionalData: ["company", "contact"],
  }, ctx);
  assertEquals(bodyOf(calls[0]).additionalData, ["company", "contact"]);
});

Deno.test("search-records: every documented view is offered, and none invented", () => {
  const view = (searchRecords.params ?? []).find((p) => p.key === "searchView");
  const options = Array.isArray(view?.options) ? view!.options! : [];
  assertEquals(options.length, 24);
  assertEquals(options.some((o) => o.value === "job_item_sub_items"), true);
  assertEquals(options.some((o) => o.value === "something_else"), false);
});
