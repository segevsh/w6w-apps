import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-employee-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-employee-search: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "employees": [{ "profile_url": "https://www.linkedin.com/in/satyanadella" }],
      "next_page": null,
    },
  }]);
  const out = await action.execute!({
    "companyProfileUrl": "https://www.linkedin.com/company/microsoft/",
    "keywordBoolean": "ceo OR cto",
    "pageSize": 10,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    url.origin + url.pathname,
    "https://enrichlayer.com/api/v2/company/employee/search/",
  );
  assertEquals(Object.fromEntries(url.searchParams), {
    "company_profile_url": "https://www.linkedin.com/company/microsoft/",
    "keyword_boolean": "ceo OR cto",
    "page_size": "10",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "employees": [{ "profile_url": "https://www.linkedin.com/in/satyanadella" }],
    "nextCursor": null,
  });
});

Deno.test("company-employee-search: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("company-employee-search: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "companyProfileUrl": "https://www.linkedin.com/company/microsoft/",
        "keywordBoolean": "ceo OR cto",
        "pageSize": 10,
      }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
