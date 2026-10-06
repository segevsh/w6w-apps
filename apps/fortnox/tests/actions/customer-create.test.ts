import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-create.ts";

Deno.test("customer-create: POST /3/customers with a wrapped body", async () => {
  const reply = { "Customer": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ status: 201, body: reply }]);
  const result = await action.execute!({
    "name": "name-v",
    "type": "PRIVATE",
    "customerNumber": "customerNumber-v",
    "organisationNumber": "organisationNumber-v",
    "email": "email-v",
    "phone1": "phone1-v",
    "address1": "address1-v",
    "address2": "address2-v",
    "zipCode": "zipCode-v",
    "city": "city-v",
    "countryCode": "countryCode-v",
    "currency": "currency-v",
    "vatNumber": "vatNumber-v",
    "vatType": "SEVAT",
    "termsOfPayment": "termsOfPayment-v",
    "emailInvoice": "emailInvoice-v",
    "active": true,
    "comments": "comments-v",
    "additionalFields": { "Comments": "extra" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/3/customers");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    Customer: {
      "Name": "name-v",
      "Type": "PRIVATE",
      "CustomerNumber": "customerNumber-v",
      "OrganisationNumber": "organisationNumber-v",
      "Email": "email-v",
      "Phone1": "phone1-v",
      "Address1": "address1-v",
      "Address2": "address2-v",
      "ZipCode": "zipCode-v",
      "City": "city-v",
      "CountryCode": "countryCode-v",
      "Currency": "currency-v",
      "VATNumber": "vatNumber-v",
      "VATType": "SEVAT",
      "TermsOfPayment": "termsOfPayment-v",
      "EmailInvoice": "emailInvoice-v",
      "Active": true,
      "Comments": "extra",
    },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, reply);

  // Optional params that were not set are left out of the payload entirely.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({} as never, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), { Customer: {} });
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});

Deno.test("customer-create: rejects an additionalFields that is not a JSON object", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ "additionalFields": "[1]" } as never, ctx),
    Error,
    "additionalFields must be a JSON object",
  );
  assertEquals(calls.length, 0);
});
