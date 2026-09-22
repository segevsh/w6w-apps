import { assert, assertEquals } from "@std/assert";
import roomTypeAvailabilityList from "../../actions/room-type-availability-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("room-type-availability-list: GET /getAvailableRoomTypes with the five required params", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ roomTypeID: "rt1" }], { roomCount: 1, count: 1, total: 1 }),
  }]);
  await roomTypeAvailabilityList.execute(
    { startDate: "2026-10-01", endDate: "2026-10-03", rooms: 1, adults: 2, children: 0 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/v1.3/getAvailableRoomTypes");
  assertEquals(queryOf(calls[0].url), {
    startDate: "2026-10-01",
    endDate: "2026-10-03",
    rooms: "1",
    adults: "2",
    children: "0",
  });
});

Deno.test("room-type-availability-list: the five vendor-required fields are declared required", () => {
  const required = new Set(
    roomTypeAvailabilityList.params!.filter((p) => p.required).map((p) => p.key),
  );
  for (const key of ["startDate", "endDate", "rooms", "adults", "children"]) {
    assert(required.has(key), `${key} should be required`);
  }
});
