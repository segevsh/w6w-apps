import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/asset-get-many.ts";

Deno.test("asset-get-many: GETs /assets and unwraps `assets`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { assets: [{ id: 1 }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/assets");
  assertEquals(out, { assets: [{ id: 1 }] });
});

Deno.test("asset-get-many: maps filter, search, trashed and the embed", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { assets: [] } }]);
  await action.execute({
    filter: "asset_type_id:25",
    search: "name:'mac'",
    trashed: true,
    includeTypeFields: true,
    orderBy: "updated_at",
    orderType: "asc",
    workspaceId: 0,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter"), "asset_type_id:25");
  assertEquals(url.searchParams.get("search"), "name:'mac'");
  assertEquals(url.searchParams.get("trashed"), "true");
  assertEquals(url.searchParams.get("include"), "type_fields");
  assertEquals(url.searchParams.get("order_by"), "updated_at");
  assertEquals(url.searchParams.get("order_type"), "asc");
  assertEquals(url.searchParams.get("workspace_id"), "0");
});
