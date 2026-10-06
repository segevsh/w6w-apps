import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/supplier-list.ts";

Deno.test("supplier-list: GET /3/suppliers with its query", async () => {
  const reply = { "Suppliers": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({
    "page": 7,
    "limit": 7,
    "supplierNumber": "supplierNumber-v",
    "name": "name-v",
    "organisationNumber": "organisationNumber-v",
    "phone": "phone-v",
    "zipCode": "zipCode-v",
    "city": "city-v",
    "email": "email-v",
    "lastModified": "lastModified-v",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://api.fortnox.se");
  assertEquals(url.pathname, "/3/suppliers");
  assertEquals(Object.fromEntries(url.searchParams), {
    "page": "7",
    "limit": "7",
    "suppliernumber": "supplierNumber-v",
    "name": "name-v",
    "organisationnumber": "organisationNumber-v",
    "phone": "phone-v",
    "zipcode": "zipCode-v",
    "city": "city-v",
    "email": "email-v",
    "lastmodified": "lastModified-v",
  });
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);

  // Unset params must never reach the wire as empty query keys.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({} as never, bare.ctx);
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});
