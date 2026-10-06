import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/supplier-update.ts";

Deno.test("supplier-update: PUT /3/suppliers/{supplierNumber} with a wrapped body", async () => {
  const reply = { "Supplier": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ status: 200, body: reply }]);
  const result = await action.execute!({
    "supplierNumber": "supplierNumber-v",
    "name": "name-v",
    "organisationNumber": "organisationNumber-v",
    "email": "email-v",
    "phone1": "phone1-v",
    "address1": "address1-v",
    "zipCode": "zipCode-v",
    "city": "city-v",
    "countryCode": "countryCode-v",
    "currency": "currency-v",
    "vatNumber": "vatNumber-v",
    "bankAccountNumber": "bankAccountNumber-v",
    "iban": "iban-v",
    "bic": "bic-v",
    "bg": "bg-v",
    "pg": "pg-v",
    "termsOfPayment": "termsOfPayment-v",
    "active": true,
    "comments": "comments-v",
    "additionalFields": { "Comments": "extra" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PUT");
  assertEquals(url.pathname, "/3/suppliers/supplierNumber-v");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    Supplier: {
      "Name": "name-v",
      "OrganisationNumber": "organisationNumber-v",
      "Email": "email-v",
      "Phone1": "phone1-v",
      "Address1": "address1-v",
      "ZipCode": "zipCode-v",
      "City": "city-v",
      "CountryCode": "countryCode-v",
      "Currency": "currency-v",
      "VATNumber": "vatNumber-v",
      "BankAccountNumber": "bankAccountNumber-v",
      "IBAN": "iban-v",
      "BIC": "bic-v",
      "BG": "bg-v",
      "PG": "pg-v",
      "TermsOfPayment": "termsOfPayment-v",
      "Active": true,
      "Comments": "extra",
    },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, reply);

  // Optional params that were not set are left out of the payload entirely.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({ "supplierNumber": "supplierNumber-v" } as never, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), { Supplier: {} });
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});

Deno.test("supplier-update: rejects an additionalFields that is not a JSON object", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!(
        { "supplierNumber": "supplierNumber-v", "additionalFields": "[1]" } as never,
        ctx,
      ),
    Error,
    "additionalFields must be a JSON object",
  );
  assertEquals(calls.length, 0);
});
