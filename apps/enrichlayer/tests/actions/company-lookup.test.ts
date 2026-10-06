import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-lookup.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-lookup: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "url": "https://www.linkedin.com/company/accenture" },
  }]);
  const out = await action.execute!(
    { "companyDomain": "accenture.com", "companyLocation": "sg" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/company/resolve");
  assertEquals(Object.fromEntries(url.searchParams), {
    "company_domain": "accenture.com",
    "company_location": "sg",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "url": "https://www.linkedin.com/company/accenture", "profile": null });
});

Deno.test("company-lookup: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("company-lookup: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({ "companyDomain": "accenture.com", "companyLocation": "sg" }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
