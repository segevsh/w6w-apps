import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import subscriptionCancel from "../../actions/subscription-cancel.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "subscriptionId": 1337, "silentCancel": true };
const RESPONSE = { "id": 1, "marker": true };

test("subscription-cancel: sends POST /v1/subscriptions/1337/cancel with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await subscriptionCancel.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/subscriptions/1337/cancel");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "silent_cancel": true });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

test("subscription-cancel: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await subscriptionCancel.execute(INPUT, ctx), { "id": 1, "marker": true });
});

test("subscription-cancel: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(subscriptionCancel.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

test("subscription-cancel: a non-integer subscriptionId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        subscriptionCancel.execute(
          { ...INPUT, subscriptionId: "1/../2" as unknown as number },
          ctx,
        ),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
