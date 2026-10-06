import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-create: POSTs JSON with the vendor's snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { company_name: "Acme", slug: "1" } }]);
  const out = await action.execute({ companyName: "Acme", industryId: 4, website: "" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/companies");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { company_name: "Acme", industry_id: 4 });
  assertEquals(out, { company_name: "Acme", slug: "1" });
});

Deno.test("company-create: refuses an empty form", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await (action.execute({}, ctx)), Error, "at least one");
  assertEquals(calls.length, 0);
});
