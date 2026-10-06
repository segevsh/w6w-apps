import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-employees-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-employees-list: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "employees": [{ "profile_url": "https://www.linkedin.com/in/a" }],
      "next_page": "https://enrichlayer.com/api/v2/company/employees/?after=c2&url=x",
    },
  }]);
  const out = await action.execute!({
    "url": "https://www.linkedin.com/company/microsoft",
    "pageSize": 2,
    "sortBy": "none",
    "after": "c1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/company/employees/");
  assertEquals(Object.fromEntries(url.searchParams), {
    "url": "https://www.linkedin.com/company/microsoft",
    "page_size": "2",
    "sort_by": "none",
    "after": "c1",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "employees": [{ "profile_url": "https://www.linkedin.com/in/a" }],
    "nextCursor": "c2",
  });
});

Deno.test("company-employees-list: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("company-employees-list: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "url": "https://www.linkedin.com/company/microsoft",
        "pageSize": 2,
        "sortBy": "none",
        "after": "c1",
      }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
