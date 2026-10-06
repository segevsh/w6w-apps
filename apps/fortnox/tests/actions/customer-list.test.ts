import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-list.ts";

Deno.test("customer-list: GET /3/customers with its query", async () => {
  const reply = { "Customers": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({
    "page": 7,
    "limit": 7,
    "filter": "active",
    "sortBy": "customernumber",
    "customerNumber": "customerNumber-v",
    "name": "name-v",
    "zipCode": "zipCode-v",
    "city": "city-v",
    "email": "email-v",
    "phone": "phone-v",
    "organisationNumber": "organisationNumber-v",
    "lastModified": "lastModified-v",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://api.fortnox.se");
  assertEquals(url.pathname, "/3/customers");
  assertEquals(Object.fromEntries(url.searchParams), {
    "page": "7",
    "limit": "7",
    "filter": "active",
    "sortby": "customernumber",
    "customernumber": "customerNumber-v",
    "name": "name-v",
    "zipcode": "zipCode-v",
    "city": "city-v",
    "email": "email-v",
    "phone": "phone-v",
    "organisationnumber": "organisationNumber-v",
    "lastmodified": "lastModified-v",
  });
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);

  // Unset params must never reach the wire as empty query keys.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({} as never, bare.ctx);
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});
