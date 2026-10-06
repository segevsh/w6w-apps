import { assertEquals } from "@std/assert";
import assetList from "../../actions/asset-list.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("asset-list: GET /v1/assets with vendor filter names", async () => {
  const { ctx, calls } = mockCtx([{
    body: { assets: [{ id: 1, name: "Pump" }], nextCursor: "n" },
  }]);
  const out = await assetList.execute({
    locationId: 4,
    manufacturer: "Acme, Bolt",
    updatedAfter: "2026-01-01T00:00:00.000Z",
    sort: "-id",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/assets");
  assertEquals(queryAll(calls[0].url), {
    locationId: ["4"],
    manufacturer: ["Acme", "Bolt"],
    "updatedAt[gte]": ["2026-01-01T00:00:00.000Z"],
    sort: ["-id"],
  });
  assertEquals(out, { assets: [{ id: 1, name: "Pump" }], nextCursor: "n" });
});
