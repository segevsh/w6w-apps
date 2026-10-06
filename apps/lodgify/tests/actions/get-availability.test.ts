import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import getAvailability from "../../actions/get-availability.ts";

Deno.test("get-availability: picks the path from the ids given", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }, { body: [] }, { body: [] }]);
  await getAvailability.execute({ start: "2026-06-01", end: "2026-06-30" }, ctx);
  await getAvailability.execute({ propertyId: 5, includeDetails: true }, ctx);
  await getAvailability.execute({ propertyId: 5, roomTypeId: 6 }, ctx);
  assertEquals(calls.map((c) => pathOf(c.url)), [
    "/v2/availability",
    "/v2/availability/5",
    "/v2/availability/5/6",
  ]);
  assertEquals(queryOf(calls[0].url), { start: "2026-06-01", end: "2026-06-30" });
  assertEquals(queryOf(calls[1].url), { includeDetails: "true" });
});

Deno.test("get-availability: refuses a room type without its property", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(getAvailability.execute({ roomTypeId: 6 }, ctx)),
    Error,
    "propertyId",
  );
  assertEquals(calls.length, 0);
});
