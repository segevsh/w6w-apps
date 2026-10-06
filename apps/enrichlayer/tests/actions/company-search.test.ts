import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-search: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "results": [{ "linkedin_profile_url": "https://www.linkedin.com/company/x/" }],
      "next_page": null,
      "total_result_count": 1,
    },
  }]);
  const out = await action.execute!({
    "country": "US",
    "employeeCountCategory": "startup",
    "foundedAfterYear": 2020,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/search/company");
  assertEquals(Object.fromEntries(url.searchParams), {
    "country": "US",
    "employee_count_category": "startup",
    "founded_after_year": "2020",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "results": [{ "linkedin_profile_url": "https://www.linkedin.com/company/x/" }],
    "nextToken": null,
    "totalResultCount": 1,
  });
});

Deno.test("company-search: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("company-search: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "country": "US",
        "employeeCountCategory": "startup",
        "foundedAfterYear": 2020,
      }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
