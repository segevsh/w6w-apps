import { assertEquals, assertRejects } from "@std/assert";
import { AssetDeliveryClient } from "../../lib/asset-client.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("AssetDeliveryClient.assetByLatest: builds /pub/{clientId}/a/latest/{path}", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: { exampleString: "hi" }, meta: { version: "abcd" } } },
  ]);
  const res = await new AssetDeliveryClient(ctx).assetByLatest("cid-1", "example/asset.json");
  assertEquals(pathOf(calls[0].url), "/v1/assets/pub/cid-1/a/latest/example/asset.json");
  assertEquals(res.meta.version, "abcd");
});

Deno.test("AssetDeliveryClient.assetByLatest: strips a leading slash from the asset path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {}, meta: { version: "v" } } }]);
  await new AssetDeliveryClient(ctx).assetByLatest("cid-1", "/example/asset.json");
  assertEquals(pathOf(calls[0].url), "/v1/assets/pub/cid-1/a/latest/example/asset.json");
});

Deno.test("AssetDeliveryClient.assetsByLatest: no prefix, assets as a comma-joined query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], meta: { version: "v" } } }]);
  await new AssetDeliveryClient(ctx).assetsByLatest("cid-1", ["a.json", "b.json"]);
  assertEquals(pathOf(calls[0].url), "/v1/assets/pub/cid-1/a/latest/");
  assertEquals(queryOf(calls[0].url), { assets: "a.json,b.json" });
});

Deno.test("AssetDeliveryClient.assetsByLatest: with a path prefix", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], meta: { version: "v" } } }]);
  await new AssetDeliveryClient(ctx).assetsByLatest("cid-1", ["a.json"], "content/pages");
  assertEquals(pathOf(calls[0].url), "/v1/assets/pub/cid-1/a/latest/content/pages/");
});

Deno.test("AssetDeliveryClient: a 404 (unknown client ID or asset) throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: { errors: [{ id: "e", status: 404, code: "not-found", title: "Not found." }] },
    },
  ]);
  await assertRejects(
    () => new AssetDeliveryClient(ctx).assetByLatest("bad-cid", "x.json"),
    Error,
    "not-found",
  );
});
