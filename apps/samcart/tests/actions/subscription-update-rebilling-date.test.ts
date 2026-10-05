import { assertEquals, assertRejects } from "@std/assert";
import subscriptionUpdateRebillingDate from "../../actions/subscription-update-rebilling-date.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "subscriptionId": 1337, "nextRebillingDate": "2026-06-15T00:00:00Z" };
const RESPONSE = { "id": 1, "marker": true };

Deno.test("subscription-update-rebilling-date: sends POST /v1/subscriptions/1337/update with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await subscriptionUpdateRebillingDate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/subscriptions/1337/update");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "next_rebilling_date": "2026-06-15T00:00:00Z",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("subscription-update-rebilling-date: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await subscriptionUpdateRebillingDate.execute(INPUT, ctx), {
    "id": 1,
    "marker": true,
  });
});

Deno.test("subscription-update-rebilling-date: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(subscriptionUpdateRebillingDate.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("subscription-update-rebilling-date: a non-integer subscriptionId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        subscriptionUpdateRebillingDate.execute({
          ...INPUT,
          subscriptionId: "1/../2" as unknown as number,
        }, ctx),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
