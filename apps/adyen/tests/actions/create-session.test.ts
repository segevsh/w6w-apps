import { assert, assertEquals, assertRejects } from "@std/assert";
import createSession from "../../actions/create-session.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = {
  "reference": "ORDER-1",
  "currency": "eur",
  "value": 1000,
  "returnUrl": "https://shop.example/return",
  "countryCode": "NL",
  "metadata": '{"a":"b"}',
} as Parameters<typeof createSession.execute>[0];

Deno.test("create-session: sends POST to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 201,
    body: { "id": "CS123", "sessionData": "Ab1", "expiresAt": "2026-10-06T10:00:00Z" },
  }]);
  const out = await createSession.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/sessions");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "merchantAccount": "TestMerchant",
    "reference": "ORDER-1",
    "amount": { "currency": "EUR", "value": 1000 },
    "returnUrl": "https://shop.example/return",
    "countryCode": "NL",
    "metadata": { "a": "b" },
  });
  assertEquals(out, { "id": "CS123", "sessionData": "Ab1", "expiresAt": "2026-10-06T10:00:00Z" });
});

Deno.test("create-session: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 201,
    body: { "id": "CS123", "sessionData": "Ab1", "expiresAt": "2026-10-06T10:00:00Z" },
  }], "live");
  await createSession.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("create-session: surfaces Adyen's error code, type and message", async () => {
  const { ctx } = connectionCtx([{
    status: 422,
    body: {
      status: 422,
      errorCode: "130",
      errorType: "validation",
      message: "Reference Missing",
      pspReference: "881",
    },
  }]);
  await assertRejects(
    () => Promise.resolve(createSession.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("create-session: sends the invocation id as Idempotency-Key", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 201,
    body: { "id": "CS123", "sessionData": "Ab1", "expiresAt": "2026-10-06T10:00:00Z" },
  }]);
  ctx.invocation = { invocationId: "inv-123" } as typeof ctx.invocation;
  await createSession.execute(INPUT, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-123");
});

Deno.test("create-session: declares idempotency as false", () => {
  assertEquals(createSession.idempotent, false);
});

Deno.test("create-session: an explicit merchantAccount beats the connection's", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 201,
    body: { "id": "CS123", "sessionData": "Ab1", "expiresAt": "2026-10-06T10:00:00Z" },
  }]);
  await createSession.execute({ ...INPUT, merchantAccount: "OtherMerchant" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null").merchantAccount, "OtherMerchant");
});
