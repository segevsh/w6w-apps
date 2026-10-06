import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/person-lookup.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("person-lookup: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "url": "https://www.linkedin.com/in/williamhgates", "profile": null },
  }]);
  const out = await action.execute!({
    "firstName": "Bill",
    "companyDomain": "gatesfoundation.org",
    "similarityChecks": "skip",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/profile/resolve");
  assertEquals(Object.fromEntries(url.searchParams), {
    "first_name": "Bill",
    "company_domain": "gatesfoundation.org",
    "similarity_checks": "skip",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "url": "https://www.linkedin.com/in/williamhgates", "profile": null });
});

Deno.test("person-lookup: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("person-lookup: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "firstName": "Bill",
        "companyDomain": "gatesfoundation.org",
        "similarityChecks": "skip",
      }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
