import { assertEquals, assertRejects } from "@std/assert";
import companyGet from "../../actions/company-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-get: GET /api/external/v1/companies/bodyglove/", async () => {
  const body = { company: { shortname: "bodyglove" } };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await companyGet.execute({ shortname: "bodyglove" }, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/bodyglove/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("company-get: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () => await companyGet.execute({ shortname: "bodyglove" }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("company-get: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await companyGet.execute({ ...{ shortname: "bodyglove" }, shortname: " " }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
