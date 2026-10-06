import { assertEquals, assertRejects } from "@std/assert";
import crewMemberList from "../../actions/crew-member-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("crew-member-list: GET /api/external/v1/companies/bodyglove/availabilities/99/crew-members/", async () => {
  const body = { crew_members: [{ pk: 4 }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await crewMemberList.execute({ shortname: "bodyglove", availabilityPk: 99 }, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(
    pathOf(calls[0].url),
    "/api/external/v1/companies/bodyglove/availabilities/99/crew-members/",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("crew-member-list: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () => await crewMemberList.execute({ shortname: "bodyglove", availabilityPk: 99 }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("crew-member-list: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await crewMemberList.execute({
        ...{ shortname: "bodyglove", availabilityPk: 99 },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
