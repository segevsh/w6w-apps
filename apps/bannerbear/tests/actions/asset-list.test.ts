import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import assetList from "../../actions/asset-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("asset-list: GET /assets", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "a1", url: "https://cdn/a1.png" }] }]);
  const out = await assetList.execute({}, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/assets");
  assertEquals(out, [{ uid: "a1", url: "https://cdn/a1.png" }]);
});
