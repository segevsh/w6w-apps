import { assertEquals, assertRejects } from "@std/assert";
import subscriptionScheduleCancel from "../../actions/subscription-schedule-cancel.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "subscriptionId": 1337, "cancelWhen": "custom", "scheduleDate": "2022-04-08" };
const RESPONSE = { "id": 1, "marker": true };

Deno.test("subscription-schedule-cancel: sends POST /v1/subscriptions/1337/scheduleCancel with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await subscriptionScheduleCancel.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/subscriptions/1337/scheduleCancel");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "cancel_when": "custom",
    "schedule_date": "2022-04-08",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("subscription-schedule-cancel: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await subscriptionScheduleCancel.execute(INPUT, ctx), { "id": 1, "marker": true });
});

Deno.test("subscription-schedule-cancel: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(subscriptionScheduleCancel.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("subscription-schedule-cancel: a non-integer subscriptionId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        subscriptionScheduleCancel.execute({
          ...INPUT,
          subscriptionId: "1/../2" as unknown as number,
        }, ctx),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
