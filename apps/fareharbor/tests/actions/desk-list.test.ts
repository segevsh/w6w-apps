import { assertEquals, assertRejects } from "@std/assert";
import deskList from "../../actions/desk-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("desk-list: GET /api/external/v1/companies/bodyglove/desks/", async () => {
  const body = { desks: [{ pk: 1 }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await deskList.execute({ shortname: "bodyglove" }, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/bodyglove/desks/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("desk-list: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () => await deskList.execute({ shortname: "bodyglove" }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("desk-list: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await deskList.execute({ ...{ shortname: "bodyglove" }, shortname: " " }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
