import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cancel-push.ts";

Deno.test("cancel-push: metadata", () => {
  assertEquals(action.key, "cancel-push");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), [
    "scheduledMessageId",
    "campaignId",
    "email",
    "userId",
  ]);
});

Deno.test("cancel-push: calls POST /push/cancel on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({
    "scheduledMessageId": 7,
    "campaignId": 7,
    "email": "abc",
    "userId": "abc",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/push/cancel");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "scheduledMessageId": 7,
    "campaignId": 7,
    "email": "abc",
    "userId": "abc",
  });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("cancel-push: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "scheduledMessageId": 7,
    "campaignId": 7,
    "email": "abc",
    "userId": "abc",
  }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/push/cancel");
});

Deno.test("cancel-push: rejects an input with no identifier without calling Iterable", async () => {
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

Deno.test("cancel-push: surfaces an HTTP error with Iterable's own code", async () => {
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

Deno.test("cancel-push: treats a 200 carrying a non-Success code as a failure", async () => {
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
