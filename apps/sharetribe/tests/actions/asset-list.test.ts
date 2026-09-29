import { assertEquals } from "@std/assert";
import assetList from "../../actions/asset-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("asset-list: comma-string assetPaths, no prefix", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], meta: { version: "v" } } }]);
  await assetList.execute({ clientId: "cid-1", assetPaths: "a.json, b.json" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/assets/pub/cid-1/a/latest/");
  assertEquals(queryOf(calls[0].url), { assets: "a.json,b.json" });
  assertEquals(assetList.requiresAuth, false);
});

Deno.test("asset-list: with a pathPrefix", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], meta: { version: "v" } } }]);
  await assetList.execute(
    { clientId: "cid-1", assetPaths: "a.json", pathPrefix: "content/pages" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/assets/pub/cid-1/a/latest/content/pages/");
});
