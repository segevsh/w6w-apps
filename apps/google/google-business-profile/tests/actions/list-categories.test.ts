import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-categories.ts";

Deno.test("list-categories: GETs /v1/categories with region, language, and default view", async () => {
  const body = {
    categories: [{ displayName: "Coffee shop", name: "categories/gcid:coffee_shop" }],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { regionCode: "US", languageCode: "en", view: "BASIC" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/categories");
  assertEquals(url.searchParams.get("regionCode"), "US");
  assertEquals(url.searchParams.get("languageCode"), "en");
  assertEquals(url.searchParams.get("view"), "BASIC");
  assertEquals(result, body);
});

Deno.test("list-categories: forwards filter and view=FULL", async () => {
  const { ctx, calls } = mockCtx([{ body: { categories: [] } }]);
  await action.execute!({
    regionCode: "US",
    languageCode: "en",
    view: "FULL",
    filter: "displayName=coffee",
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("view"), "FULL");
  assertEquals(params.get("filter"), "displayName=coffee");
});

Deno.test("list-categories: defaults view to BASIC when omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { categories: [] } }]);
  // @ts-expect-error — exercising the runtime default when a caller omits a required param.
  await action.execute!({ regionCode: "US", languageCode: "en" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("view"), "BASIC");
  assert(url.searchParams.has("view"));
});
