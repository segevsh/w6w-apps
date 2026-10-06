import { assertEquals, assertRejects } from "@std/assert";
import itemGet from "../../actions/item-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("item-get: GET /api/external/v1/companies/bodyglove/items/7/", async () => {
  const body = { item: { pk: 7 } };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await itemGet.execute({ shortname: "bodyglove", itemPk: 7 }, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/bodyglove/items/7/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("item-get: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () => await itemGet.execute({ shortname: "bodyglove", itemPk: 7 }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("item-get: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await itemGet.execute({ ...{ shortname: "bodyglove", itemPk: 7 }, shortname: " " }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
