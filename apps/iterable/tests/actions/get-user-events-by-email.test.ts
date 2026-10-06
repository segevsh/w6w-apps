import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user-events-by-email.ts";

Deno.test("get-user-events-by-email: metadata", () => {
  assertEquals(action.key, "get-user-events-by-email");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["email", "limit"]);
});

Deno.test("get-user-events-by-email: calls GET /events/abc on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "events": [{ "eventName": "x" }] } }]);
  const out = await action.execute({ "email": "abc", "limit": 7 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.iterable.com/api/events/abc?limit=7");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "events": [{ "eventName": "x" }] });
});

Deno.test("get-user-events-by-email: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "events": [{ "eventName": "x" }] } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "email": "abc", "limit": 7 }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/events/abc?limit=7");
});

Deno.test("get-user-events-by-email: rejects a missing `email` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "limit": 7 }, ctx);
    },
    Error,
    "`email` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-user-events-by-email: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "email": "abc", "limit": 7 }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("get-user-events-by-email: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "email": "abc", "limit": 7 }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
