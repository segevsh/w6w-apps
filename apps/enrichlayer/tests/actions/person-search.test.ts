import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/person-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("person-search: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "results": [{ "linkedin_profile_url": "https://www.linkedin.com/in/a" }],
      "next_page": "https://enrichlayer.com/api/v2/search/person?next_token=abc123&page_size=5",
      "total_result_count": 42,
    },
  }]);
  const out = await action.execute!({
    "country": "US",
    "currentRoleTitle": "cto",
    "pageSize": 5,
    "skillsAllInList": "python,go",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/search/person");
  assertEquals(Object.fromEntries(url.searchParams), {
    "country": "US",
    "current_role_title": "cto",
    "skills_all_in_list": "python,go",
    "page_size": "5",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "results": [{ "linkedin_profile_url": "https://www.linkedin.com/in/a" }],
    "nextToken": "abc123",
    "totalResultCount": 42,
  });
});

Deno.test("person-search: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("person-search: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "country": "US",
        "currentRoleTitle": "cto",
        "pageSize": 5,
        "skillsAllInList": "python,go",
      }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
