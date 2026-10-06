import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/trigger-campaign.ts";

Deno.test("trigger-campaign: metadata", () => {
  assertEquals(action.key, "trigger-campaign");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params?.map((p) => p.key), [
    "campaignId",
    "listIds",
    "suppressionListIds",
    "dataFields",
    "allowRepeatMarketingSends",
  ]);
});

Deno.test("trigger-campaign: calls POST /campaigns/trigger on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({
    "campaignId": 7,
    "listIds": [1, 2],
    "suppressionListIds": [1, 2],
    "dataFields": { "a": 1 },
    "allowRepeatMarketingSends": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/campaigns/trigger");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "campaignId": 7,
    "listIds": [1, 2],
    "suppressionListIds": [1, 2],
    "dataFields": { "a": 1 },
    "allowRepeatMarketingSends": true,
  });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("trigger-campaign: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "campaignId": 7,
    "listIds": [1, 2],
    "suppressionListIds": [1, 2],
    "dataFields": { "a": 1 },
    "allowRepeatMarketingSends": true,
  }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/campaigns/trigger");
});

Deno.test("trigger-campaign: rejects a missing `campaignId` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({
        "listIds": [1, 2],
        "suppressionListIds": [1, 2],
        "dataFields": { "a": 1 },
        "allowRepeatMarketingSends": true,
      }, ctx);
    },
    Error,
    "`campaignId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("trigger-campaign: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "campaignId": 7,
        "listIds": [1, 2],
        "suppressionListIds": [1, 2],
        "dataFields": { "a": 1 },
        "allowRepeatMarketingSends": true,
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("trigger-campaign: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "campaignId": 7,
        "listIds": [1, 2],
        "suppressionListIds": [1, 2],
        "dataFields": { "a": 1 },
        "allowRepeatMarketingSends": true,
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
