import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import companyCreate from "../../actions/company-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "name": "Acme SAS",
  "address_contact_name": "Jane Doe",
  "address_street": "1 rue de Rivoli",
  "address_zip_code": "75001",
  "address_city": "Paris",
  "address_country": "France",
  "currency": "EUR",
  "language": "fr",
  "thirdparty_code": "411ACME",
  "intracommunity_number": "FR123",
  "iban": "FR7630006000011234567890189",
  "bic": "AGRIFRPP",
  "siret": "12345678900011",
  "comments": "vip",
  "custom_fields": '{"Segment": "b2b"}',
  "categories": '["Retail"]',
  "internal_id": "C-1",
  "business_manager": "a@b.fr",
  "is_prospect": true,
  "is_customer": false,
  "isB2C": false,
  "employees": '[{"firstname": "Jane", "lastname": "Doe", "email": "j@d.fr"}]',
};

Deno.test("company-create: POST /api/v2/companies with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1 } }]);
  const out = await companyCreate.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/companies");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "Acme SAS",
    "address_contact_name": "Jane Doe",
    "address_street": "1 rue de Rivoli",
    "address_zip_code": "75001",
    "address_city": "Paris",
    "address_country": "France",
    "currency": "EUR",
    "language": "fr",
    "thirdparty_code": "411ACME",
    "intracommunity_number": "FR123",
    "iban": "FR7630006000011234567890189",
    "bic": "AGRIFRPP",
    "siret": "12345678900011",
    "comments": "vip",
    "custom_fields": {
      "Segment": "b2b",
    },
    "categories": [
      "Retail",
    ],
    "internal_id": "C-1",
    "business_manager": "a@b.fr",
    "is_prospect": true,
    "is_customer": false,
    "isB2C": false,
    "employees": [
      {
        "firstname": "Jane",
        "lastname": "Doe",
        "email": "j@d.fr",
      },
    ],
  });
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { id: 1 });
});

Deno.test("company-create: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await companyCreate.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("company-create: invalid JSON in custom_fields is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await (companyCreate.execute({
      ...({
        "name": "Acme SAS",
        "address_contact_name": "Jane Doe",
        "address_street": "1 rue de Rivoli",
        "address_zip_code": "75001",
        "address_city": "Paris",
        "address_country": "France",
        "currency": "EUR",
        "language": "fr",
        "thirdparty_code": "411ACME",
        "intracommunity_number": "FR123",
        "iban": "FR7630006000011234567890189",
        "bic": "AGRIFRPP",
        "siret": "12345678900011",
        "comments": "vip",
        "custom_fields": '{"Segment": "b2b"}',
        "categories": '["Retail"]',
        "internal_id": "C-1",
        "business_manager": "a@b.fr",
        "is_prospect": true,
        "is_customer": false,
        "isB2C": false,
        "employees": '[{"firstname": "Jane", "lastname": "Doe", "email": "j@d.fr"}]',
      }),
      "custom_fields": "{not json",
    } as never, ctx))
  );
  assertStringIncludes((err as Error).message, "Axonaut: custom_fields");
  assertEquals(calls.length, 0);
});
