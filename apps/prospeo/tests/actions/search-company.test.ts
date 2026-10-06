import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-company.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

const filters = { company_industry: { include: ["Software Development"] } };

Deno.test("search-company: posts filters and page to /search-company", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      error: false,
      free: false,
      results: [{ company: { name: "A" } }],
      pagination: { current_page: 2, per_page: 25, total_page: 3, total_count: 60 },
    },
  }]);
  const out = await exec(action, { filters, page: 2 }, ctx);
  assertEquals(calls[0].url, "https://api.prospeo.io/search-company");
  assertEquals(bodyOf(calls[0]), { filters, page: 2 });
  assertEquals(out.results.length, 1);
  assertEquals(out.pagination.total_count, 60);
  assertEquals(out.free, false);
});

Deno.test("search-company: defaults page to 1, accepts a JSON string, NO_RESULTS is empty", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: { error: true, error_code: "NO_RESULTS" },
  }]);
  const out = await exec(action, { filters: JSON.stringify(filters) }, ctx);
  assertEquals(bodyOf(calls[0]), { filters, page: 1 });
  assertEquals(out.results, []);
});

Deno.test("search-company: INVALID_FILTERS surfaces filter_error; non-object filters never call", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: { error: true, error_code: "INVALID_FILTERS", filter_error: "Invalid industry" },
  }]);
  await assertRejects(() => exec(action, { filters }, ctx), Error, "Invalid industry");
  await assertRejects(() => exec(action, { filters: [] }, ctx), Error, "must be an object");
  assertEquals(calls.length, 1);
});
