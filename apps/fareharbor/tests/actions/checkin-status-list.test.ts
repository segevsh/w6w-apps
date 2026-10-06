import { assertEquals, assertRejects } from "@std/assert";
import checkinStatusList from "../../actions/checkin-status-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("checkin-status-list: GET /api/external/v1/companies/bodyglove/checkin-statuses/", async () => {
  const body = { checkin_statuses: [{ pk: 1 }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await checkinStatusList.execute({ shortname: "bodyglove" }, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/bodyglove/checkin-statuses/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("checkin-status-list: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () => await checkinStatusList.execute({ shortname: "bodyglove" }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("checkin-status-list: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await checkinStatusList.execute({ ...{ shortname: "bodyglove" }, shortname: " " }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
