import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-update.ts";

Deno.test("customer-update: PUT /3/customers/{customerNumber} with a wrapped body", async () => {
  const reply = { "Customer": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ status: 200, body: reply }]);
  const result = await action.execute!({
    "customerNumber": "customerNumber-v",
    "name": "name-v",
    "type": "PRIVATE",
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
  assertEquals(calls[0].method, "PUT");
  assertEquals(url.pathname, "/3/customers/customerNumber-v");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    Customer: {
      "Name": "name-v",
      "Type": "PRIVATE",
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
  await action.execute!({ "customerNumber": "customerNumber-v" } as never, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), { Customer: {} });
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});

Deno.test("customer-update: rejects an additionalFields that is not a JSON object", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!(
        { "customerNumber": "customerNumber-v", "additionalFields": "[1]" } as never,
        ctx,
      ),
    Error,
    "additionalFields must be a JSON object",
  );
  assertEquals(calls.length, 0);
});
