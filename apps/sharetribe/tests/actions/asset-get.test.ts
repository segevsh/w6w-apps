import { assertEquals } from "@std/assert";
import assetGet from "../../actions/asset-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("asset-get: GET /v1/assets/pub/{clientId}/a/latest/{assetPath}, requiresAuth false", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: { exampleString: "hi" }, meta: { version: "abcd" } } },
  ]);
  const result = await assetGet.execute(
    { clientId: "cid-1", assetPath: "example/asset.json" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/assets/pub/cid-1/a/latest/example/asset.json");
  assertEquals((result as { meta: { version: string } }).meta.version, "abcd");
  assertEquals(assetGet.requiresAuth, false);
});
