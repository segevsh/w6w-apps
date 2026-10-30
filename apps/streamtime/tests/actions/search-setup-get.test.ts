import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import searchSetupGet from "../../actions/search-setup-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("search-setup-get: reads GET /v2/search/setup for one view", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        filters: [{ selector: "job_status", name: "Job Status", filterType: "Select" }],
        additionalData: ["company"],
        sortColumns: ["job_name"],
      },
    },
  ]);
  const result = await searchSetupGet.execute({ searchView: "jobs" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v2/search/setup");
  assertEquals(queryOf(calls[0].url), { search_view: "jobs" });
  // The body is returned whole: its three keys are documented, so they are named.
  assertEquals(Object.keys(result).sort(), ["additionalData", "filters", "sortColumns"]);
});

/** This is the endpoint the vendor tells callers to fetch first. */
test("search-setup-get: the description carries the vendor's own advice", () => {
  assert(/reusing it/.test(searchSetupGet.description ?? ""));
});
