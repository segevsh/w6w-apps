import { assert, assertEquals, assertRejects } from "@std/assert";
import updateSession from "../../actions/update-session.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = {
  "sessionId": "CS1",
  "sessionData": "Ab1",
  "currency": "EUR",
  "value": 1500,
  "payable": true,
} as Parameters<typeof updateSession.execute>[0];

Deno.test("update-session: sends PATCH to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{ status: 200, body: { "sessionData": "Ab2" } }]);
  const out = await updateSession.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/sessions/CS1");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "sessionData": "Ab1",
    "payable": true,
    "amount": { "currency": "EUR", "value": 1500 },
  });
  assertEquals(out, { "sessionData": "Ab2" });
});

Deno.test("update-session: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{ status: 200, body: { "sessionData": "Ab2" } }], "live");
  await updateSession.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("update-session: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(updateSession.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("update-session: declares idempotency as true", () => {
  assertEquals(updateSession.idempotent, true);
});
