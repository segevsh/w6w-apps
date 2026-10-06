import { assertEquals, assertRejects } from "@std/assert";
import timeOffCreate from "../../actions/time-off-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("time-off-create: POST /resource-planner/assignments with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await timeOffCreate.execute({
    "startDate": "2019-01-21",
    "endDate": "2019-02-01",
    "timeOffType": 16539,
    "user": 79786,
    "timeOffPeriod": "full-day",
    "attachments": "68797",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/resource-planner/assignments");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "type": "time-off",
    "startDate": "2019-01-21",
    "endDate": "2019-02-01",
    "timeOffType": 16539,
    "user": 79786,
    "timeOffPeriod": "full-day",
    "attachments": [68797],
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("time-off-create: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        timeOffCreate.execute({
          "startDate": "2019-01-21",
          "endDate": "2019-02-01",
          "timeOffType": 16539,
          "user": 79786,
          "timeOffPeriod": "full-day",
          "attachments": "68797",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("time-off-create: declares perform and idempotent=false", () => {
  assertEquals(timeOffCreate.type, "perform");
  assertEquals(timeOffCreate.idempotent, false);
});
