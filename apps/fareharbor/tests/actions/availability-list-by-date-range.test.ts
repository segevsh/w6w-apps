import { assertEquals, assertRejects } from "@std/assert";
import availabilityListByDateRange from "../../actions/availability-list-by-date-range.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("availability-list-by-date-range: GET /api/external/v1/companies/bodyglove/items/7/minimal/availabilities/date-range/2026-11-02/2026-11-08/", async () => {
  const body = { availabilities: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await availabilityListByDateRange.execute({
      shortname: "bodyglove",
      itemPk: 7,
      startDate: "2026-11-02",
      endDate: "2026-11-08",
    }, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(
    pathOf(calls[0].url),
    "/api/external/v1/companies/bodyglove/items/7/minimal/availabilities/date-range/2026-11-02/2026-11-08/",
  );
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("availability-list-by-date-range: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () =>
      await availabilityListByDateRange.execute({
        shortname: "bodyglove",
        itemPk: 7,
        startDate: "2026-11-02",
        endDate: "2026-11-08",
      }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("availability-list-by-date-range: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await availabilityListByDateRange.execute({
        ...{ shortname: "bodyglove", itemPk: 7, startDate: "2026-11-02", endDate: "2026-11-08" },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
