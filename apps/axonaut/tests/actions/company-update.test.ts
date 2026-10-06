import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import companyUpdate from "../../actions/company-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "companyId": 42,
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
};

Deno.test("company-update: PATCH /api/v2/companies/42 with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1 } }]);
  const out = await companyUpdate.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/companies/42");
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
  });
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { id: 1 });
});

Deno.test("company-update: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await companyUpdate.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("company-update: invalid JSON in custom_fields is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await (companyUpdate.execute({
      ...({
        "companyId": 42,
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
      }),
      "custom_fields": "{not json",
    } as never, ctx))
  );
  assertStringIncludes((err as Error).message, "Axonaut: custom_fields");
  assertEquals(calls.length, 0);
});
