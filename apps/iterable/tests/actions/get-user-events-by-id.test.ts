import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user-events-by-id.ts";

Deno.test("get-user-events-by-id: metadata", () => {
  assertEquals(action.key, "get-user-events-by-id");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["userId", "limit"]);
});

Deno.test("get-user-events-by-id: calls GET /events/byUserId/abc on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "events": [{ "eventName": "x" }] } }]);
  const out = await action.execute({ "userId": "abc", "limit": 7 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.iterable.com/api/events/byUserId/abc?limit=7");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "events": [{ "eventName": "x" }] });
});

Deno.test("get-user-events-by-id: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "events": [{ "eventName": "x" }] } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "userId": "abc", "limit": 7 }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/events/byUserId/abc?limit=7");
});

Deno.test("get-user-events-by-id: rejects a missing `userId` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "limit": 7 }, ctx);
    },
    Error,
    "`userId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-user-events-by-id: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "userId": "abc", "limit": 7 }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("get-user-events-by-id: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "userId": "abc", "limit": 7 }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
