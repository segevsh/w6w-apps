import { assertEquals, assertRejects } from "@std/assert";
import customerSubscriptionList from "../../actions/customer-subscription-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "customerId": 1337,
  "createdAtMin": "2025-01-16T14:30:00Z",
  "createdAtMax": "2025-01-31",
  "rebillingAtMin": "2025-02-01",
  "rebillingAtMax": "2025-02-28",
  "canceledAtMin": "2025-03-01",
  "canceledAtMax": "2025-03-31",
  "subscriptionStatus": "active",
  "subscriptionType": "recurring_subscription",
  "testMode": "false",
};
const RESPONSE = [{ "id": 1 }];

Deno.test("customer-subscription-list: sends GET /v1/customers/1337/subscriptions with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await customerSubscriptionList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/customers/1337/subscriptions");
  assertEquals(queryOf(calls[0].url), {
    "created_at_min": "2025-01-16T14:30:00Z",
    "created_at_max": "2025-01-31",
    "rebilling_at_min": "2025-02-01",
    "rebilling_at_max": "2025-02-28",
    "canceled_at_min": "2025-03-01",
    "canceled_at_max": "2025-03-31",
    "status": "active",
    "type": "recurring_subscription",
    "test_mode": "false",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("customer-subscription-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await customerSubscriptionList.execute(INPUT, ctx), { "data": [{ "id": 1 }] });
});

Deno.test("customer-subscription-list: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(customerSubscriptionList.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("customer-subscription-list: a non-integer customerId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        customerSubscriptionList.execute(
          { ...INPUT, customerId: "1/../2" as unknown as number },
          ctx,
        ),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
