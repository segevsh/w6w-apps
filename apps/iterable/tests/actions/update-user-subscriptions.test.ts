import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-user-subscriptions.ts";

Deno.test("update-user-subscriptions: metadata", () => {
  assertEquals(action.key, "update-user-subscriptions");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), [
    "email",
    "userId",
    "emailListIds",
    "unsubscribedChannelIds",
    "unsubscribedMessageTypeIds",
    "subscribedMessageTypeIds",
    "campaignId",
    "templateId",
    "validateChannelAlignment",
  ]);
});

Deno.test("update-user-subscriptions: calls POST /users/updateSubscriptions on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({
    "email": "abc",
    "userId": "abc",
    "emailListIds": [1, 2],
    "unsubscribedChannelIds": [1, 2],
    "unsubscribedMessageTypeIds": [1, 2],
    "subscribedMessageTypeIds": [1, 2],
    "campaignId": 7,
    "templateId": 7,
    "validateChannelAlignment": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/users/updateSubscriptions");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "email": "abc",
    "userId": "abc",
    "emailListIds": [1, 2],
    "unsubscribedChannelIds": [1, 2],
    "unsubscribedMessageTypeIds": [1, 2],
    "subscribedMessageTypeIds": [1, 2],
    "campaignId": 7,
    "templateId": 7,
    "validateChannelAlignment": true,
  });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("update-user-subscriptions: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "email": "abc",
    "userId": "abc",
    "emailListIds": [1, 2],
    "unsubscribedChannelIds": [1, 2],
    "unsubscribedMessageTypeIds": [1, 2],
    "subscribedMessageTypeIds": [1, 2],
    "campaignId": 7,
    "templateId": 7,
    "validateChannelAlignment": true,
  }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/users/updateSubscriptions");
});

Deno.test("update-user-subscriptions: rejects an input with no identifier without calling Iterable", async () => {
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

Deno.test("update-user-subscriptions: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "email": "abc",
        "userId": "abc",
        "emailListIds": [1, 2],
        "unsubscribedChannelIds": [1, 2],
        "unsubscribedMessageTypeIds": [1, 2],
        "subscribedMessageTypeIds": [1, 2],
        "campaignId": 7,
        "templateId": 7,
        "validateChannelAlignment": true,
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("update-user-subscriptions: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "email": "abc",
        "userId": "abc",
        "emailListIds": [1, 2],
        "unsubscribedChannelIds": [1, 2],
        "unsubscribedMessageTypeIds": [1, 2],
        "subscribedMessageTypeIds": [1, 2],
        "campaignId": 7,
        "templateId": 7,
        "validateChannelAlignment": true,
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
