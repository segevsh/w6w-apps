import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-sms.ts";

Deno.test("send-sms: metadata", () => {
  assertEquals(action.key, "send-sms");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params?.map((p) => p.key), [
    "campaignId",
    "recipientEmail",
    "recipientUserId",
    "dataFields",
    "sendAt",
    "allowRepeatMarketingSends",
  ]);
});

Deno.test("send-sms: calls POST /sms/target on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({
    "campaignId": 7,
    "recipientEmail": "abc",
    "recipientUserId": "abc",
    "dataFields": { "a": 1 },
    "sendAt": "abc",
    "allowRepeatMarketingSends": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/sms/target");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "campaignId": 7,
    "recipientEmail": "abc",
    "recipientUserId": "abc",
    "dataFields": { "a": 1 },
    "sendAt": "abc",
    "allowRepeatMarketingSends": true,
  });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("send-sms: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "campaignId": 7,
    "recipientEmail": "abc",
    "recipientUserId": "abc",
    "dataFields": { "a": 1 },
    "sendAt": "abc",
    "allowRepeatMarketingSends": true,
  }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/sms/target");
});

Deno.test("send-sms: rejects a missing `campaignId` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({
        "recipientEmail": "abc",
        "recipientUserId": "abc",
        "dataFields": { "a": 1 },
        "sendAt": "abc",
        "allowRepeatMarketingSends": true,
      }, ctx);
    },
    Error,
    "`campaignId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-sms: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "campaignId": 7,
        "recipientEmail": "abc",
        "recipientUserId": "abc",
        "dataFields": { "a": 1 },
        "sendAt": "abc",
        "allowRepeatMarketingSends": true,
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("send-sms: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "campaignId": 7,
        "recipientEmail": "abc",
        "recipientUserId": "abc",
        "dataFields": { "a": 1 },
        "sendAt": "abc",
        "allowRepeatMarketingSends": true,
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
