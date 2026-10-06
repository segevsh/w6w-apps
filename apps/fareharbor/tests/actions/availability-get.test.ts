import { assertEquals, assertRejects } from "@std/assert";
import availabilityGet from "../../actions/availability-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("availability-get: GET /api/external/v1/companies/bodyglove/availabilities/99/", async () => {
  const body = { availability: { pk: 99 } };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await availabilityGet.execute(
      { shortname: "bodyglove", availabilityPk: 99, detailed: false },
      ctx,
    ),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/bodyglove/availabilities/99/");
  assertEquals(queryOf(calls[0].url), { detailed: "no" });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("availability-get: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () =>
      await availabilityGet.execute(
        { shortname: "bodyglove", availabilityPk: 99, detailed: false },
        ctx,
      ),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("availability-get: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await availabilityGet.execute({
        ...{ shortname: "bodyglove", availabilityPk: 99, detailed: false },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
