import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-employee-count.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-employee-count: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "estimated_employee_count": 529274, "verified_employee_count": 3 },
  }]);
  const out = await action.execute!({
    "url": "https://www.linkedin.com/company/apple/",
    "estimatedEmployeeCount": "include",
    "atDate": "2023-12-31",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/company/employees/count");
  assertEquals(Object.fromEntries(url.searchParams), {
    "url": "https://www.linkedin.com/company/apple/",
    "at_date": "2023-12-31",
    "estimated_employee_count": "include",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "verifiedEmployeeCount": 3, "estimatedEmployeeCount": 529274 });
});

Deno.test("company-employee-count: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("company-employee-count: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "url": "https://www.linkedin.com/company/apple/",
        "estimatedEmployeeCount": "include",
        "atDate": "2023-12-31",
      }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
