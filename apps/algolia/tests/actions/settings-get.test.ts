import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/settings-get.ts";

test("settings-get: reads settings from the DSN host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { searchableAttributes: ["name"] } }], {
    display: { appId: "APPID" },
  });
  await action.execute!({ indexName: "products" }, ctx);
  assertEquals(calls[0].url, "https://appid-dsn.algolia.net/1/indexes/products/settings");
});
