import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/order-list.ts";

Deno.test("order-list: GET /3/orders with its query", async () => {
  const reply = { "Orders": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({
    "page": 7,
    "limit": 7,
    "filter": "cancelled",
    "sortBy": "customername",
    "customerNumber": "customerNumber-v",
    "customerName": "customerName-v",
    "documentNumber": "documentNumber-v",
    "fromDate": "fromDate-v",
    "toDate": "toDate-v",
    "project": "project-v",
    "lastModified": "lastModified-v",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://api.fortnox.se");
  assertEquals(url.pathname, "/3/orders");
  assertEquals(Object.fromEntries(url.searchParams), {
    "page": "7",
    "limit": "7",
    "filter": "cancelled",
    "sortby": "customername",
    "customernumber": "customerNumber-v",
    "customername": "customerName-v",
    "documentnumber": "documentNumber-v",
    "fromdate": "fromDate-v",
    "todate": "toDate-v",
    "project": "project-v",
    "lastmodified": "lastModified-v",
  });
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);

  // Unset params must never reach the wire as empty query keys.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({} as never, bare.ctx);
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});
