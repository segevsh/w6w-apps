import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/call-log.ts";

const RESPONSE = { "success": true, "data": { "callLogId": "1" } };

Deno.test("call-log: calls POST /api/client/v2/calls/log and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({
    "contactId": 11,
    "toNumber": "+15551234567",
    "fromNumber": "+15557654321",
    "callDispositionId": 2,
    "callSentimentId": 3,
    "callScript": "Intro",
    "durationMs": 61000,
    "calledAt": "2026-10-06T14:00:00Z",
    "taskId": 9,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/calls/log");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "contactId": 11,
    "toNumber": "+15551234567",
    "fromNumber": "+15557654321",
    "callDispositionId": 2,
    "callSentimentId": 3,
    "callScript": "Intro",
    "durationMs": 61000,
    "calledAt": "2026-10-06T14:00:00Z",
    "taskId": 9,
  });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("call-log: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "contactId": 11 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), { "contactId": 11 });
});

Deno.test("call-log: refuses a missing contactId before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({} as never, ctx));
  assertEquals(calls.length, 0);
});

Deno.test("call-log: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "contactId": 11,
        "toNumber": "+15551234567",
        "fromNumber": "+15557654321",
        "callDispositionId": 2,
        "callSentimentId": 3,
        "callScript": "Intro",
        "durationMs": 61000,
        "calledAt": "2026-10-06T14:00:00Z",
        "taskId": 9,
      }, ctx),
    Error,
    "insufficientCredits",
  );
});
