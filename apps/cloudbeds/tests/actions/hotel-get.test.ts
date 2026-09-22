import { assertEquals } from "@std/assert";
import hotelGet from "../../actions/hotel-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("hotel-get: GET /getHotelDetails with propertyID", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ propertyID: "1", propertyName: "Acme Inn" }),
  }]);
  const result = await hotelGet.execute({ propertyID: "1" }, ctx) as {
    success: boolean;
    data: unknown;
  };

  assertEquals(pathOf(calls[0].url), "/api/v1.3/getHotelDetails");
  assertEquals(queryOf(calls[0].url), { propertyID: "1" });
  assertEquals(result.data, { propertyID: "1", propertyName: "Acme Inn" });
});

Deno.test("hotel-get: propertyID is optional — omitted uses the token's own property", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ propertyID: "1" }) }]);
  await hotelGet.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
