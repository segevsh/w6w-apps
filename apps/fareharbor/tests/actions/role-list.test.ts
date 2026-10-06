import { assertEquals, assertRejects } from "@std/assert";
import roleList from "../../actions/role-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("role-list: GET /api/external/v1/companies/bodyglove/roles/", async () => {
  const body = { roles: [{ pk: 1 }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await roleList.execute({ shortname: "bodyglove" }, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/bodyglove/roles/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("role-list: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () => await roleList.execute({ shortname: "bodyglove" }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("role-list: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await roleList.execute({ ...{ shortname: "bodyglove" }, shortname: " " }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
