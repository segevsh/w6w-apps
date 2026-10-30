import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-attribute-metadata.ts";

test("list-attribute-metadata: GETs /v1/attributes scoped by parent (location)", async () => {
  const body = { attributeMetadata: [{ displayName: "Wi-Fi" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ parent: "locations/1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/attributes");
  assertEquals(url.searchParams.get("parent"), "locations/1");
  assertEquals(result, body);
});

test("list-attribute-metadata: scoped by category + region + language", async () => {
  const { ctx, calls } = mockCtx([{ body: { attributeMetadata: [] } }]);
  await action.execute!({
    categoryName: "categories/gcid:restaurant",
    regionCode: "US",
    languageCode: "en",
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("categoryName"), "categories/gcid:restaurant");
  assertEquals(params.get("regionCode"), "US");
  assertEquals(params.get("languageCode"), "en");
  assert(!params.has("parent"));
});

test("list-attribute-metadata: showAll scope", async () => {
  const { ctx, calls } = mockCtx([{ body: { attributeMetadata: [] } }]);
  await action.execute!({ showAll: true, regionCode: "US", languageCode: "en" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("showAll"), "true");
});
