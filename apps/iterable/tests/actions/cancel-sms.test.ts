import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cancel-sms.ts";

test("cancel-sms: metadata", () => {
  assertEquals(action.key, "cancel-sms");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), [
    "scheduledMessageId",
    "campaignId",
    "email",
    "userId",
  ]);
});

test("cancel-sms: calls POST /sms/cancel on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({
    "scheduledMessageId": 7,
    "campaignId": 7,
    "email": "abc",
    "userId": "abc",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/sms/cancel");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "scheduledMessageId": 7,
    "campaignId": 7,
    "email": "abc",
    "userId": "abc",
  });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

test("cancel-sms: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "scheduledMessageId": 7,
    "campaignId": 7,
    "email": "abc",
    "userId": "abc",
  }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/sms/cancel");
});

test("cancel-sms: rejects an input with no identifier without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "is required",
  );
  assertEquals(calls.length, 0);
});

test("cancel-sms: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "scheduledMessageId": 7,
        "campaignId": 7,
        "email": "abc",
        "userId": "abc",
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

test("cancel-sms: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "scheduledMessageId": 7,
        "campaignId": 7,
        "email": "abc",
        "userId": "abc",
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
