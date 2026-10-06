import { assertEquals, assertRejects } from "@std/assert";
import availabilityListByDate from "../../actions/availability-list-by-date.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("availability-list-by-date: GET /api/external/v1/companies/bodyglove/items/7/minimal/availabilities/date/2026-11-02/", async () => {
  const body = { availabilities: [{ pk: 99, capacity: 4 }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await availabilityListByDate.execute({
      shortname: "bodyglove",
      itemPk: 7,
      date: "2026-11-02T00:00:00Z",
      bookableOnly: true,
    }, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(
    pathOf(calls[0].url),
    "/api/external/v1/companies/bodyglove/items/7/minimal/availabilities/date/2026-11-02/",
  );
  assertEquals(queryOf(calls[0].url), { bookable_only: "yes" });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("availability-list-by-date: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () =>
      await availabilityListByDate.execute({
        shortname: "bodyglove",
        itemPk: 7,
        date: "2026-11-02T00:00:00Z",
        bookableOnly: true,
      }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("availability-list-by-date: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await availabilityListByDate.execute({
        ...{ shortname: "bodyglove", itemPk: 7, date: "2026-11-02T00:00:00Z", bookableOnly: true },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
