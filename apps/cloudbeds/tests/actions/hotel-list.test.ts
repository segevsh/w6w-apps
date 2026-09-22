import { assertEquals } from "@std/assert";
import hotelList from "../../actions/hotel-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("hotel-list: GET /getHotels with the given filters", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ propertyID: "1", propertyName: "Acme Inn" }], { count: 1, total: 1 }),
  }]);
  const result = await hotelList.execute(
    { propertyName: "Acme", pageNumber: 1, pageSize: 10 },
    ctx,
  ) as { success: boolean; data: unknown[]; count: number; total: number };

  assertEquals(pathOf(calls[0].url), "/api/v1.3/getHotels");
  assertEquals(queryOf(calls[0].url), { propertyName: "Acme", pageNumber: "1", pageSize: "10" });
  assertEquals(result.data, [{ propertyID: "1", propertyName: "Acme Inn" }]);
  assertEquals(result.count, 1);
});

Deno.test("hotel-list: omitted filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await hotelList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
