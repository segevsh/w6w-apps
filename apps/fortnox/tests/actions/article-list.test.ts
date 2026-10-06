import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/article-list.ts";

Deno.test("article-list: GET /3/articles with its query", async () => {
  const reply = { "Articles": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({
    "page": 7,
    "limit": 7,
    "filter": "active",
    "sortBy": "articlenumber",
    "articleNumber": "articleNumber-v",
    "description": "description-v",
    "ean": "ean-v",
    "supplierNumber": "supplierNumber-v",
    "manufacturer": "manufacturer-v",
    "lastModified": "lastModified-v",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://api.fortnox.se");
  assertEquals(url.pathname, "/3/articles");
  assertEquals(Object.fromEntries(url.searchParams), {
    "page": "7",
    "limit": "7",
    "filter": "active",
    "sortby": "articlenumber",
    "articlenumber": "articleNumber-v",
    "description": "description-v",
    "ean": "ean-v",
    "suppliernumber": "supplierNumber-v",
    "manufacturer": "manufacturer-v",
    "lastmodified": "lastModified-v",
  });
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);

  // Unset params must never reach the wire as empty query keys.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({} as never, bare.ctx);
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});
