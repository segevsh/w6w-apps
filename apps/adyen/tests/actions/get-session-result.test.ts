import { assert, assertEquals, assertRejects } from "@std/assert";
import getSessionResult from "../../actions/get-session-result.ts";
import { connectionCtx, pathOf } from "../_helpers.ts";

const INPUT = { "sessionId": "CS 1", "sessionResult": "res/1" } as Parameters<
  typeof getSessionResult.execute
>[0];

Deno.test("get-session-result: sends GET to the documented path and returns the response", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "id": "CS 1", "status": "completed" },
  }]);
  const out = await getSessionResult.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/sessions/CS%201");
  assertEquals(Object.fromEntries(new URL(calls[0].url).searchParams), {
    "sessionResult": "res/1",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": "CS 1", "status": "completed" });
});

Deno.test("get-session-result: targets the connection's base URL and carries no credential", async () => {
  const { ctx, calls } = connectionCtx([{
    status: 200,
    body: { "id": "CS 1", "status": "completed" },
  }], "live");
  await getSessionResult.execute(INPUT, ctx);
  assert(
    calls[0].url.startsWith(
      "https://1797a841fbb37ca7-adyendemo-checkout-live.adyenpayments.com/checkout/v72/",
    ),
  ); // URL parsing lowercases the host
  assert(!("x-api-key" in calls[0].headers), "the key comes from sign, not the action");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("get-session-result: surfaces Adyen's error code, type and message", async () => {
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
    () => Promise.resolve(getSessionResult.execute(INPUT, ctx)),
    Error,
    "validation, code 130): Reference Missing [pspReference 881]",
  );
});

Deno.test("get-session-result: is a read-only action", () => {
  assertEquals(getSessionResult.type, "read");
});
