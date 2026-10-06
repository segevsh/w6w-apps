import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/unsubscribe-from-list.ts";

Deno.test("unsubscribe-from-list: metadata", () => {
  assertEquals(action.key, "unsubscribe-from-list");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), [
    "listId",
    "subscribers",
    "campaignId",
    "channelUnsubscribe",
  ]);
});

Deno.test("unsubscribe-from-list: calls POST /lists/unsubscribe on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "successCount": 1, "failCount": 0 } }]);
  const out = await action.execute({
    "listId": 7,
    "subscribers": [{ "x": 1 }],
    "campaignId": 7,
    "channelUnsubscribe": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/lists/unsubscribe");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "listId": 7,
    "subscribers": [{ "x": 1 }],
    "campaignId": 7,
    "channelUnsubscribe": true,
  });
  assertEquals(out, { "successCount": 1, "failCount": 0 });
});

Deno.test("unsubscribe-from-list: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "successCount": 1, "failCount": 0 } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "listId": 7,
    "subscribers": [{ "x": 1 }],
    "campaignId": 7,
    "channelUnsubscribe": true,
  }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/lists/unsubscribe");
});

Deno.test("unsubscribe-from-list: rejects a missing `listId` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({
        "subscribers": [{ "x": 1 }],
        "campaignId": 7,
        "channelUnsubscribe": true,
      }, ctx);
    },
    Error,
    "`listId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("unsubscribe-from-list: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "listId": 7,
        "subscribers": [{ "x": 1 }],
        "campaignId": 7,
        "channelUnsubscribe": true,
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("unsubscribe-from-list: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "listId": 7,
        "subscribers": [{ "x": 1 }],
        "campaignId": 7,
        "channelUnsubscribe": true,
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
