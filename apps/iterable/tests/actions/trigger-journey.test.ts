import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/trigger-journey.ts";

Deno.test("trigger-journey: metadata", () => {
  assertEquals(action.key, "trigger-journey");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params?.map((p) => p.key), [
    "workflowId",
    "email",
    "userId",
    "listId",
    "dataFields",
  ]);
});

Deno.test("trigger-journey: calls POST /workflows/triggerWorkflow on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({
    "workflowId": 7,
    "email": "abc",
    "userId": "abc",
    "listId": 7,
    "dataFields": { "a": 1 },
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/workflows/triggerWorkflow");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "workflowId": 7,
    "email": "abc",
    "userId": "abc",
    "listId": 7,
    "dataFields": { "a": 1 },
  });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("trigger-journey: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "workflowId": 7,
    "email": "abc",
    "userId": "abc",
    "listId": 7,
    "dataFields": { "a": 1 },
  }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/workflows/triggerWorkflow");
});

Deno.test("trigger-journey: rejects a missing `workflowId` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({
        "email": "abc",
        "userId": "abc",
        "listId": 7,
        "dataFields": { "a": 1 },
      }, ctx);
    },
    Error,
    "`workflowId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("trigger-journey: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "workflowId": 7,
        "email": "abc",
        "userId": "abc",
        "listId": 7,
        "dataFields": { "a": 1 },
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("trigger-journey: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "workflowId": 7,
        "email": "abc",
        "userId": "abc",
        "listId": 7,
        "dataFields": { "a": 1 },
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
