import { assertEquals } from "@std/assert";
import locationCreate from "../../actions/location-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("location-create: POST /v1/locations; the vendor answers 200 { id }", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 21 } }]);
  const out = await locationCreate.execute(
    { name: "Warehouse 2", parentId: 3, address: "1 Main St", vendorIds: "5" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/locations");
  assertEquals(bodyOf(calls[0]), {
    name: "Warehouse 2",
    parentId: 3,
    address: "1 Main St",
    vendorIds: [5],
  });
  assertEquals(out, { id: 21 });
  assertEquals(locationCreate.idempotent, false);
});
