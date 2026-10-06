import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/enrich-company.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("enrich-company: posts data to /enrich-company and returns the company", async () => {
  const { ctx, calls } = mockCtx([{
    body: { error: false, free_enrichment: true, company: { company_id: "c1" } },
  }]);
  const out = await exec(action, { companyWebsite: "intercom.com", companyId: "c1" }, ctx);
  assertEquals(calls[0].url, "https://api.prospeo.io/enrich-company");
  assertEquals(bodyOf(calls[0]), { data: { company_website: "intercom.com", company_id: "c1" } });
  assertEquals(out, { matched: true, free_enrichment: true, company: { company_id: "c1" } });
});

Deno.test("enrich-company: NO_MATCH is unmatched; empty input throws before any call", async () => {
  const { ctx, calls } = mockCtx([{ status: 400, body: { error: true, error_code: "NO_MATCH" } }]);
  assertEquals((await exec(action, { companyName: "Zzz" }, ctx)).matched, false);
  await assertRejects(() => exec(action, {}, ctx), Error, "at least one");
  assertEquals(calls.length, 1);
});
