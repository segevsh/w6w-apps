import { assertEquals, assertRejects } from "@std/assert";
import companyList from "../../actions/company-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-list: GET /api/external/v1/companies/", async () => {
  const body = { companies: [{ shortname: "bodyglove", name: "Body Glove", currency: "usd" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await companyList.execute({}, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("company-list: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () => await companyList.execute({}, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});
