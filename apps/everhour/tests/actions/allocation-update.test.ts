import { assertEquals, assertRejects } from "@std/assert";
import allocationUpdate from "../../actions/allocation-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("allocation-update: PUT /allocations/{allocationId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await allocationUpdate.execute({
    "allocationId": 876534,
    "startDate": "2019-01-01",
    "endDate": "2019-12-31",
    "users": [79786],
    "timeOffType": 16539,
    "days": 25,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/allocations/876534");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "startDate": "2019-01-01",
    "endDate": "2019-12-31",
    "users": [79786],
    "timeOffType": 16539,
    "days": 25,
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("allocation-update: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        allocationUpdate.execute({
          "allocationId": 876534,
          "startDate": "2019-01-01",
          "endDate": "2019-12-31",
          "users": [79786],
          "timeOffType": 16539,
          "days": 25,
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("allocation-update: declares perform and idempotent=true", () => {
  assertEquals(allocationUpdate.type, "perform");
  assertEquals(allocationUpdate.idempotent, true);
});
