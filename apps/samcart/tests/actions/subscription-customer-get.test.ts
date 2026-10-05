import { assertEquals, assertRejects } from "@std/assert";
import subscriptionCustomerGet from "../../actions/subscription-customer-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "subscriptionId": 1337 };
const RESPONSE = { "id": 1, "marker": true };

Deno.test("subscription-customer-get: sends GET /v1/subscriptions/1337/customer with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await subscriptionCustomerGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/subscriptions/1337/customer");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("subscription-customer-get: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await subscriptionCustomerGet.execute(INPUT, ctx), { "id": 1, "marker": true });
});

Deno.test("subscription-customer-get: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(subscriptionCustomerGet.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("subscription-customer-get: a non-integer subscriptionId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        subscriptionCustomerGet.execute(
          { ...INPUT, subscriptionId: "1/../2" as unknown as number },
          ctx,
        ),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
