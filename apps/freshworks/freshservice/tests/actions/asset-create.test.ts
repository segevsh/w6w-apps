import { assertEquals, assertThrows } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/asset-create.ts";

Deno.test("asset-create: POSTs /assets and unwraps `asset`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { asset: { id: 1, display_id: 5 } } }]);
  const out = await action.execute({ name: "Macbook Pro", assetTypeId: 25 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/assets");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Macbook Pro", asset_type_id: 25 });
  assertEquals(out, { id: 1, display_id: 5 });
});

Deno.test("asset-create: passes type_fields through as the flat suffixed map", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: {} }]);
  await action.execute({
    name: "n",
    assetTypeId: 25,
    typeFields: { serial_number_25: "SW12131133", asset_state_25: "In Use" },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).type_fields, {
    serial_number_25: "SW12131133",
    asset_state_25: "In Use",
  });
});

Deno.test("asset-create: rejects a non-object type_fields instead of sending nonsense", () => {
  const { ctx } = mockFreshserviceCtx();
  assertThrows(
    () => action.execute({ name: "n", assetTypeId: 25, typeFields: "[1,2]" }, ctx),
    Error,
    "must be a JSON object",
  );
});

Deno.test("asset-create: impact and usage type are strings here, not the ticket integers", () => {
  const impact = action.params?.find((p) => p.key === "impact");
  assertEquals(impact?.default, "low");
  assertEquals((impact?.options as { value: string }[])[0].value, "low");
});
