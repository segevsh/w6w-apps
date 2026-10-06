import { assertEquals } from "@std/assert";
import { mockFormsiteCtx } from "../_helpers.ts";
import resultList from "../../actions/result-list.ts";

const B = "https://fs3.formsite.com/api/v2/acme";
const paged = {
  "content-type": "application/json",
  "pagination-page-current": "1",
  "pagination-page-last": "3",
};

Deno.test("result-list: maps filters to the documented snake_case query params", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ body: { results: [{ id: "1" }] }, headers: paged }]);
  const out = await resultList.execute({
    formDir: "f1",
    limit: 50,
    page: 2,
    afterId: 10,
    beforeId: 99,
    afterDate: "2026-01-01",
    beforeDate: "2026-02-01",
    sortId: "100",
    sortDirection: "asc",
    resultsView: "rv1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/acme/forms/f1/results");
  assertEquals(Object.fromEntries(url.searchParams), {
    limit: "50",
    page: "2",
    after_date: "2026-01-01",
    before_date: "2026-02-01",
    after_id: "10",
    before_id: "99",
    sort_id: "100",
    sort_direction: "asc",
    results_view: "rv1",
  });
  assertEquals(out, { results: [{ id: "1" }], page: 1, lastPage: 3 });
});

Deno.test("result-list: sends nothing but the path when no filters are set", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ body: {} }]);
  const out = await resultList.execute({ formDir: "f1" }, ctx);
  assertEquals(calls[0].url, B + "/forms/f1/results");
  assertEquals(out, { results: [], page: undefined, lastPage: undefined });
});
