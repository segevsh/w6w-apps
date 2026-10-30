import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-campaign.ts";

test("get-campaign: metadata", () => {
  assertEquals(action.key, "get-campaign");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["id"]);
});

test("get-campaign: calls GET /campaigns/7 on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 5, "name": "N", "campaignState": "Draft" } }]);
  const out = await action.execute({ "id": 7 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.iterable.com/api/campaigns/7");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 5, "name": "N", "campaignState": "Draft" });
});

test("get-campaign: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 5, "name": "N", "campaignState": "Draft" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "id": 7 }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/campaigns/7");
});

test("get-campaign: rejects a missing `id` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`id` is required",
  );
  assertEquals(calls.length, 0);
});

test("get-campaign: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "id": 7 }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

test("get-campaign: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "id": 7 }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
