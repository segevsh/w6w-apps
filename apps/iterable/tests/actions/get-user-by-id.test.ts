import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user-by-id.ts";

test("get-user-by-id: metadata", () => {
  assertEquals(action.key, "get-user-by-id");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["userId"]);
});

test("get-user-by-id: calls GET /users/byUserId on the US host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "user": { "email": "a@b.co", "userId": "u1", "dataFields": {} } },
  }]);
  const out = await action.execute({ "userId": "abc" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.iterable.com/api/users/byUserId?userId=abc");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { user: { "email": "a@b.co", "userId": "u1", "dataFields": {} } });
});

test("get-user-by-id: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "user": { "email": "a@b.co", "userId": "u1", "dataFields": {} } },
  }], { connection: { display: { region: "eu" } } });
  await action.execute({ "userId": "abc" }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/users/byUserId?userId=abc");
});

test("get-user-by-id: rejects a missing `userId` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`userId` is required",
  );
  assertEquals(calls.length, 0);
});

test("get-user-by-id: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "userId": "abc" }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

test("get-user-by-id: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "userId": "abc" }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
