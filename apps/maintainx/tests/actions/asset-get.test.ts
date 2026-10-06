import { assertEquals } from "@std/assert";
import assetGet from "../../actions/asset-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("asset-get: GET /v1/assets/{id} unwraps { asset }", async () => {
  const { ctx, calls } = mockCtx([{ body: { asset: { id: 2, name: "Boiler" } } }]);
  const out = await assetGet.execute({ assetId: 2, organizationId: 3 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/assets/2");
  assertEquals(calls[0].headers["x-organization-id"], "3");
  assertEquals(out, { id: 2, name: "Boiler" });
});
