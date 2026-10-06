import { assertEquals } from "@std/assert";
import subscriptionUpdate from "../../actions/subscription-update.ts";
import { bodyOf, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscription-update: PATCH /v3/subscriptions/s-1 with the documented wrapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ uuid: "r-1" }) }]);
  const out = await subscriptionUpdate.execute({
    "uuid": "s-1",
    "private": true,
    "amount": 2500,
    "interval": "MONTH",
    "count": 1,
    "nextPayment": "2026-11-01T00:00:00Z",
  }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v3/subscriptions/s-1");
  assertEquals(queryOf(calls[0].url), { "private": "true" });
  assertEquals(bodyOf(calls[0]), {
    "data": {
      "amount": 2500,
      "interval": "MONTH",
      "count": 1,
      "nextPayment": "2026-11-01T00:00:00Z",
    },
  });
  assertEquals(out, { uuid: "r-1" });
});

Deno.test("subscription-update: is a perform action marked idempotent=true", () => {
  assertEquals(subscriptionUpdate.type, "perform");
  assertEquals(subscriptionUpdate.idempotent, true);
});

Deno.test("subscription-update: only the fields given are sent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await subscriptionUpdate.execute({ "uuid": "s" }, ctx);
  assertEquals(bodyOf(calls[0]), { "data": {} });
});

Deno.test("subscription-update: malformed JSON in a custom-field param fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await subscriptionUpdate.execute({
      "uuid": "s-1",
      "private": true,
      "amount": 2500,
      "interval": "MONTH",
      "count": 1,
      "nextPayment": "2026-11-01T00:00:00Z",
      public: "{not json",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "public is not valid JSON");
  assertEquals(calls.length, 0);
});

Deno.test("subscription-update: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", detail: "You must login again" },
  }]);
  let message = "";
  try {
    await subscriptionUpdate.execute({
      "uuid": "s-1",
      "private": true,
      "amount": 2500,
      "interval": "MONTH",
      "count": 1,
      "nextPayment": "2026-11-01T00:00:00Z",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 401"), true, message);
  assertEquals(message.includes("You must login again"), true, message);
});
