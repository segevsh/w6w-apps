import { assertEquals, assertRejects } from "@std/assert";
import timecardGet from "../../actions/timecard-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timecard-get: GET /users/{userId}/timecards/{date} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await timecardGet.execute({ "userId": 89, "date": "2020-10-21" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/users/89/timecards/2020-10-21");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("timecard-get: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () => Promise.resolve(timecardGet.execute({ "userId": 89, "date": "2020-10-21" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("timecard-get: declares read", () => {
  assertEquals(timecardGet.type, "read");
});
