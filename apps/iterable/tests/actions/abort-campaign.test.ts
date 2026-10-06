import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/abort-campaign.ts";

Deno.test("abort-campaign: metadata", () => {
  assertEquals(action.key, "abort-campaign");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), ["campaignId"]);
});

Deno.test("abort-campaign: calls POST /campaigns/abort on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({ "campaignId": 7 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/campaigns/abort");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "campaignId": 7 });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("abort-campaign: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "campaignId": 7 }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/campaigns/abort");
});

Deno.test("abort-campaign: rejects a missing `campaignId` without calling Iterable", async () => {
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

Deno.test("abort-campaign: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "campaignId": 7 }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("abort-campaign: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "campaignId": 7 }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
