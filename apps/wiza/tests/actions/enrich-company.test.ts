import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/enrich-company.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("enrich-company: posts only the supplied identifiers and returns data", async () => {
  const data = {
    company_name: "Wiza",
    company_domain: "wiza.co",
    credits: { api_credits: { total: 2 } },
  };
  const { ctx, calls } = mockCtx([{
    body: { status: { code: 200 }, type: "company_enrichment", data },
  }]);
  const out = await exec(action, { companyDomain: "wiza.co", companyLinkedinSlug: "wiza" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://wiza.co/api/company_enrichments");
  assertEquals(bodyOf(calls[0]), { company_domain: "wiza.co", company_linkedin_slug: "wiza" });
  assertEquals(out, data);
});

Deno.test("enrich-company: maps name and LinkedIn id; requires at least one identifier", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await exec(action, { companyName: "Wiza", companyLinkedinId: "18663757" }, ctx);
  assertEquals(bodyOf(calls[0]), { company_name: "Wiza", company_linkedin_id: "18663757" });
  const none = mockCtx();
  await assertRejects(() => exec(action, {}, none.ctx), Error, "at least one");
  assertEquals(none.calls.length, 0);
});

Deno.test("enrich-company: a 404 company-not-found fails the action", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: { code: 404, message: "Company not found" } },
  }]);
  await assertRejects(() => exec(action, { companyName: "Nope" }, ctx), Error, "404");
});
