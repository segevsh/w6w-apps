import { assertEquals, assertRejects } from "@std/assert";
import subscriptionChargeList from "../../actions/subscription-charge-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "subscriptionId": 1337,
  "createdAtMin": "2025-01-16T14:30:00Z",
  "createdAtMax": "2025-01-31",
  "testMode": "false",
};
const RESPONSE = [{ "id": 1 }];

Deno.test("subscription-charge-list: sends GET /v1/subscriptions/1337/charges with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await subscriptionChargeList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/subscriptions/1337/charges");
  assertEquals(queryOf(calls[0].url), {
    "created_at_min": "2025-01-16T14:30:00Z",
    "created_at_max": "2025-01-31",
    "test_mode": "false",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("subscription-charge-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await subscriptionChargeList.execute(INPUT, ctx), { "data": [{ "id": 1 }] });
});

Deno.test("subscription-charge-list: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(subscriptionChargeList.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("subscription-charge-list: a non-integer subscriptionId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        subscriptionChargeList.execute(
          { ...INPUT, subscriptionId: "1/../2" as unknown as number },
          ctx,
        ),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
