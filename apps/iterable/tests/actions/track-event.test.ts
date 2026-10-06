import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/track-event.ts";

Deno.test("track-event: metadata", () => {
  assertEquals(action.key, "track-event");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params?.map((p) => p.key), [
    "eventName",
    "email",
    "userId",
    "dataFields",
    "id",
    "createdAt",
    "campaignId",
    "templateId",
    "createNewFields",
  ]);
});

Deno.test("track-event: calls POST /events/track on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({
    "eventName": "abc",
    "email": "abc",
    "userId": "abc",
    "dataFields": { "a": 1 },
    "id": "abc",
    "createdAt": 7,
    "campaignId": 7,
    "templateId": 7,
    "createNewFields": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/events/track");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "eventName": "abc",
    "email": "abc",
    "userId": "abc",
    "dataFields": { "a": 1 },
    "id": "abc",
    "createdAt": 7,
    "campaignId": 7,
    "templateId": 7,
    "createNewFields": true,
  });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("track-event: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "eventName": "abc",
    "email": "abc",
    "userId": "abc",
    "dataFields": { "a": 1 },
    "id": "abc",
    "createdAt": 7,
    "campaignId": 7,
    "templateId": 7,
    "createNewFields": true,
  }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/events/track");
});

Deno.test("track-event: rejects a missing `eventName` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({
        "email": "abc",
        "userId": "abc",
        "dataFields": { "a": 1 },
        "id": "abc",
        "createdAt": 7,
        "campaignId": 7,
        "templateId": 7,
        "createNewFields": true,
      }, ctx);
    },
    Error,
    "`eventName` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("track-event: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "eventName": "abc",
        "email": "abc",
        "userId": "abc",
        "dataFields": { "a": 1 },
        "id": "abc",
        "createdAt": 7,
        "campaignId": 7,
        "templateId": 7,
        "createNewFields": true,
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("track-event: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "eventName": "abc",
        "email": "abc",
        "userId": "abc",
        "dataFields": { "a": 1 },
        "id": "abc",
        "createdAt": 7,
        "campaignId": 7,
        "templateId": 7,
        "createNewFields": true,
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
