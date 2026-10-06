import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/track-purchase.ts";

Deno.test("track-purchase: metadata", () => {
  assertEquals(action.key, "track-purchase");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params?.map((p) => p.key), [
    "user",
    "items",
    "total",
    "id",
    "createdAt",
    "campaignId",
    "templateId",
    "dataFields",
  ]);
});

Deno.test("track-purchase: calls POST /commerce/trackPurchase on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({
    "user": { "a": 1 },
    "items": [{ "x": 1 }],
    "total": 12.5,
    "id": "abc",
    "createdAt": 7,
    "campaignId": 7,
    "templateId": 7,
    "dataFields": { "a": 1 },
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/commerce/trackPurchase");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "user": { "a": 1 },
    "items": [{ "x": 1 }],
    "total": 12.5,
    "id": "abc",
    "createdAt": 7,
    "campaignId": 7,
    "templateId": 7,
    "dataFields": { "a": 1 },
  });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("track-purchase: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "user": { "a": 1 },
    "items": [{ "x": 1 }],
    "total": 12.5,
    "id": "abc",
    "createdAt": 7,
    "campaignId": 7,
    "templateId": 7,
    "dataFields": { "a": 1 },
  }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/commerce/trackPurchase");
});

Deno.test("track-purchase: rejects a missing `user` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({
        "items": [{ "x": 1 }],
        "total": 12.5,
        "id": "abc",
        "createdAt": 7,
        "campaignId": 7,
        "templateId": 7,
        "dataFields": { "a": 1 },
      }, ctx);
    },
    Error,
    "`user` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("track-purchase: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "user": { "a": 1 },
        "items": [{ "x": 1 }],
        "total": 12.5,
        "id": "abc",
        "createdAt": 7,
        "campaignId": 7,
        "templateId": 7,
        "dataFields": { "a": 1 },
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("track-purchase: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "user": { "a": 1 },
        "items": [{ "x": 1 }],
        "total": 12.5,
        "id": "abc",
        "createdAt": 7,
        "campaignId": 7,
        "templateId": 7,
        "dataFields": { "a": 1 },
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
