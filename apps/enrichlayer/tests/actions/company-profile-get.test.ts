import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-profile-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-profile-get: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "name": "Google", "linkedin_internal_id": "1441" } }]);
  const out = await action.execute!({
    "url": "https://www.linkedin.com/company/google/",
    "fundingData": "include",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/company");
  assertEquals(Object.fromEntries(url.searchParams), {
    "url": "https://www.linkedin.com/company/google/",
    "funding_data": "include",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "profile": { "name": "Google", "linkedin_internal_id": "1441" },
    "name": "Google",
  });
});

Deno.test("company-profile-get: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("company-profile-get: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "url": "https://www.linkedin.com/company/google/",
        "fundingData": "include",
      }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
