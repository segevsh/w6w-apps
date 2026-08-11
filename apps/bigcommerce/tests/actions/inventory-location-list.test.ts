import { assert, assertEquals } from "@std/assert";
import inventoryLocationList from "../../actions/inventory-location-list.ts";
import { mockCtx, pathOf, queryOf, v3Page } from "../_helpers.ts";

Deno.test("inventory-location-list: GETs /v3/inventory/locations", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([{ id: 1, code: "MAIN" }]) }]);
  const out = await inventoryLocationList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/inventory/locations");
  assertEquals(out.data.length, 1);
});

Deno.test("inventory-location-list: booleans use the true/false spelling here", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([]) }]);
  await inventoryLocationList.execute({ isActive: true, managedByExternalSource: false }, ctx);
  assertEquals(queryOf(calls[0].url), {
    is_active: "true",
    managed_by_external_source: "false",
  });
});

Deno.test("inventory-location-list: warns about externally managed locations", () => {
  const managed = inventoryLocationList.params?.find((p) => p.key === "managedByExternalSource");
  assert(managed?.hint?.includes("will fight it"), managed?.hint);
});
