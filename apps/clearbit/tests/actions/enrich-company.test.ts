import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/enrich-company.ts";

Deno.test("enrich-company: GETs company-stream.clearbit.com/v2/companies/find?domain=...", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", name: "Uber", domain: "uber.com" } }]);
  const result = await action.execute!({ domain: "uber.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://company-stream.clearbit.com/v2/companies/find?domain=uber.com",
  );
  assertEquals(result, { id: "c1", name: "Uber", domain: "uber.com" });
});

Deno.test("enrich-company: optional fields map to snake_case/verbatim query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      domain: "uber.com",
      companyName: "Uber",
      linkedin: "company/uber",
      twitter: "uber",
      facebook: "uber",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("company_name"), "Uber");
  assertEquals(url.searchParams.get("linkedin"), "company/uber");
  assertEquals(url.searchParams.get("twitter"), "uber");
  assertEquals(url.searchParams.get("facebook"), "uber");
});

Deno.test("enrich-company: requires domain", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ domain: "" }, ctx), Error, "domain");
  assertEquals(calls.length, 0);
});
