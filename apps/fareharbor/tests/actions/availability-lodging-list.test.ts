import { assertEquals, assertRejects } from "@std/assert";
import availabilityLodgingList from "../../actions/availability-lodging-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("availability-lodging-list: GET /api/external/v1/companies/bodyglove/availabilities/99/lodgings/", async () => {
  const body = { lodgings: [{ pk: 3 }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await availabilityLodgingList.execute({ shortname: "bodyglove", availabilityPk: 99 }, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(
    pathOf(calls[0].url),
    "/api/external/v1/companies/bodyglove/availabilities/99/lodgings/",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("availability-lodging-list: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () =>
      await availabilityLodgingList.execute({ shortname: "bodyglove", availabilityPk: 99 }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("availability-lodging-list: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await availabilityLodgingList.execute({
        ...{ shortname: "bodyglove", availabilityPk: 99 },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
