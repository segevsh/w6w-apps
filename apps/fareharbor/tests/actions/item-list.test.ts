import { assertEquals, assertRejects } from "@std/assert";
import itemList from "../../actions/item-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("item-list: GET /api/external/v1/companies/bodyglove/items/", async () => {
  const body = { items: [{ pk: 7, name: "Snorkel" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await itemList.execute({
      shortname: "bodyglove",
      detailed: true,
      requireFutureAvailabilities: false,
    }, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/bodyglove/items/");
  assertEquals(queryOf(calls[0].url), { detailed: "yes", require_future_availabilities: "no" });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("item-list: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () =>
      await itemList.execute({
        shortname: "bodyglove",
        detailed: true,
        requireFutureAvailabilities: false,
      }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("item-list: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await itemList.execute({
        ...{ shortname: "bodyglove", detailed: true, requireFutureAvailabilities: false },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
