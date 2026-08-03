import { assert, assertEquals } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx, paramsOf } from "../_helpers.ts";
import action from "../../actions/form-results-get.ts";

Deno.test("form-results-get: GETs /forms/{id}/results with no search by default", async () => {
  const results = { entry_count: 12, field_data: {} };
  const { ctx, calls } = mockCtx([{ body: results }], { display: DISPLAY });
  const out = await action.execute!({ formId: 30 }, ctx) as { results: unknown };
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/30/results`);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.results, results);
});

Deno.test("form-results-get: serialises the search object as a JSON query param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  const search = {
    status: "active",
    mode: "all",
    field_filters: [{ key: "2", value: "yes", operator: "is" }],
  };
  await action.execute!({ formId: 30, search }, ctx);
  assertEquals(paramsOf(calls).get("search"), JSON.stringify(search));
});

Deno.test("form-results-get: passes a pre-serialised search string through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ formId: 30, search: '{"status":"spam"}' }, ctx);
  assertEquals(paramsOf(calls).get("search"), '{"status":"spam"}');
});

Deno.test("form-results-get: is a read action against the form resource", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "form");
  assert(action.output);
});
