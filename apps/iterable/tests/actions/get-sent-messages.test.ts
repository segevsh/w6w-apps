import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-sent-messages.ts";

Deno.test("get-sent-messages: metadata", () => {
  assertEquals(action.key, "get-sent-messages");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "email",
    "userId",
    "limit",
    "campaignIds",
    "startDateTime",
    "endDateTime",
    "excludeBlastCampaigns",
    "messageMedium",
  ]);
});

Deno.test("get-sent-messages: calls GET /users/getSentMessages on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "messages": [{ "messageId": "m1" }] } }]);
  const out = await action.execute({
    "email": "abc",
    "userId": "abc",
    "limit": 7,
    "campaignIds": [1, 2],
    "startDateTime": "abc",
    "endDateTime": "abc",
    "excludeBlastCampaigns": true,
    "messageMedium": "Email",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.iterable.com/api/users/getSentMessages?email=abc&userId=abc&limit=7&campaignIds=1&campaignIds=2&startDateTime=abc&endDateTime=abc&excludeBlastCampaigns=true&messageMedium=Email",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "messages": [{ "messageId": "m1" }] });
});

Deno.test("get-sent-messages: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "messages": [{ "messageId": "m1" }] } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "email": "abc",
    "userId": "abc",
    "limit": 7,
    "campaignIds": [1, 2],
    "startDateTime": "abc",
    "endDateTime": "abc",
    "excludeBlastCampaigns": true,
    "messageMedium": "Email",
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.eu.iterable.com/api/users/getSentMessages?email=abc&userId=abc&limit=7&campaignIds=1&campaignIds=2&startDateTime=abc&endDateTime=abc&excludeBlastCampaigns=true&messageMedium=Email",
  );
});

Deno.test("get-sent-messages: rejects an input with no identifier without calling Iterable", async () => {
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

Deno.test("get-sent-messages: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "email": "abc",
        "userId": "abc",
        "limit": 7,
        "campaignIds": [1, 2],
        "startDateTime": "abc",
        "endDateTime": "abc",
        "excludeBlastCampaigns": true,
        "messageMedium": "Email",
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("get-sent-messages: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "email": "abc",
        "userId": "abc",
        "limit": 7,
        "campaignIds": [1, 2],
        "startDateTime": "abc",
        "endDateTime": "abc",
        "excludeBlastCampaigns": true,
        "messageMedium": "Email",
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
