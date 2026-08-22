import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/rule-search.ts";

const display = { appId: "APPID" };

Deno.test("rule-search: an empty query lists every rule", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { hits: [] } }], { display });
  await action.execute!({ indexName: "products" }, ctx);
  assertEquals(calls[0].url, "https://appid-dsn.algolia.net/1/indexes/products/rules/search");
});

Deno.test("rule-search: enabled=false is a real filter and survives", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ indexName: "products", enabled: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).enabled, false);
});
