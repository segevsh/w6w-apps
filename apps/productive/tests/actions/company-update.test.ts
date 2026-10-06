import { assertEquals, assertRejects } from "@std/assert";
import companyUpdate from "../../actions/company-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-update: PATCH /companies/{id} sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "companies", "attributes": { "name": "x" } } },
  }]);
  const out = await companyUpdate.execute({
    "id": "42",
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
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/companies/42");
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

Deno.test("company-update: only the fields set are sent", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "companies", "attributes": { "name": "x" } } },
  }]);
  await companyUpdate.execute({ id: "42", name: "sample name" }, ctx);
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: { type: "companies", attributes: { "name": "sample name" } },
  });
});

Deno.test("company-update: naming no field to change fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(companyUpdate.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("at least one field"), true, err.message);
  assertEquals(calls.length, 0);
});

Deno.test("company-update: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(companyUpdate.execute({ id: "42", name: "sample name" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("company-update: declares perform and idempotent=true", () => {
  assertEquals(companyUpdate.type, "perform");
  assertEquals(companyUpdate.idempotent, true);
  assertEquals(companyUpdate.key, "company-update");
});
