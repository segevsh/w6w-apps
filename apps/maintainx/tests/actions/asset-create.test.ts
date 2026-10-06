import { assertEquals } from "@std/assert";
import assetCreate from "../../actions/asset-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("asset-create: POST /v1/assets, manufacturer/model nest as {name}", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 11 } }]);
  const out = await assetCreate.execute({
    name: "Compressor",
    serialNumber: "SN1",
    locationId: 4,
    teamIds: "1,2",
    assetTypes: "HVAC",
    manufacturerName: "Acme",
    modelName: "X1",
    extraFields: { Zone: "B" },
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/assets");
  assertEquals(bodyOf(calls[0]), {
    name: "Compressor",
    serialNumber: "SN1",
    locationId: 4,
    teamIds: [1, 2],
    assetTypes: ["HVAC"],
    manufacturer: { name: "Acme" },
    model: { name: "X1" },
    extraFields: { Zone: "B" },
  });
  assertEquals(out, { id: 11 });
});

Deno.test("asset-create: only name is sent when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await assetCreate.execute({ name: "A" }, ctx);
  assertEquals(bodyOf(calls[0]), { name: "A" });
  assertEquals(assetCreate.idempotent, false);
});
