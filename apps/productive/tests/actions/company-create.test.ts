import { assertEquals, assertRejects } from "@std/assert";
import companyCreate from "../../actions/company-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-create: POST /companies sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "companies", "attributes": { "name": "x" } } },
  }]);
  const out = await companyCreate.execute({
    "name": "sample name",
    "billingName": "sample billingName",
    "vat": "sample vat",
    "domain": "sample domain",
    "defaultCurrency": "sample defaultCurrency",
    "dueDays": 7,
    "paymentTermsType": "days_after_invoice_date",
    "companyCode": "sample companyCode",
    "parentCompanyId": 7,
    "contact": '{"email": "a@b.com"}',
    "tagList": "sample tagList",
    "customFields": '{"1": "x"}',
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/companies");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: {
      type: "companies",
      attributes: {
        "name": "sample name",
        "billing_name": "sample billingName",
        "vat": "sample vat",
        "domain": "sample domain",
        "default_currency": "sample defaultCurrency",
        "due_days": 7,
        "payment_terms_type": "days_after_invoice_date",
        "company_code": "sample companyCode",
        "parent_company_id": 7,
        "contact": { "email": "a@b.com" },
        "tag_list": "sample tagList",
        "custom_fields": { "1": "x" },
      },
    },
  });
  assertEquals((out as Record<string, unknown>).id, "42");
});

Deno.test("company-create: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(companyCreate.execute({ "name": "sample name" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("company-create: declares perform and idempotent=false", () => {
  assertEquals(companyCreate.type, "perform");
  assertEquals(companyCreate.idempotent, false);
  assertEquals(companyCreate.key, "company-create");
});
