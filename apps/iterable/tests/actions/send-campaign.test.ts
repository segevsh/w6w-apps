import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-campaign.ts";

Deno.test("send-campaign: metadata", () => {
  assertEquals(action.key, "send-campaign");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params?.map((p) => p.key), ["campaignId"]);
});

Deno.test("send-campaign: calls POST /campaigns/7/send on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({ "campaignId": 7 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/campaigns/7/send");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("send-campaign: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "campaignId": 7 }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/campaigns/7/send");
});

Deno.test("send-campaign: rejects a missing `campaignId` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`campaignId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-campaign: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "campaignId": 7 }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("send-campaign: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "campaignId": 7 }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
