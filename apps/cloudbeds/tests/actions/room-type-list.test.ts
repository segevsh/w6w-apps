import { assertEquals } from "@std/assert";
import roomTypeList from "../../actions/room-type-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("room-type-list: GET /getRoomTypes, rate-date filters are optional", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ roomTypeID: "rt1" }]) }]);
  await roomTypeList.execute({ propertyIDs: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1.3/getRoomTypes");
  assertEquals(queryOf(calls[0].url), { propertyIDs: "1" });
});

Deno.test("room-type-list: startDate/endDate/adults/children are sent when given (rates)", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await roomTypeList.execute(
    { startDate: "2026-10-01", endDate: "2026-10-03", adults: 2, children: 0 },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    startDate: "2026-10-01",
    endDate: "2026-10-03",
    adults: "2",
    children: "0",
  });
});
