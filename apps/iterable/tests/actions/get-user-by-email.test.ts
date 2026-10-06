import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user-by-email.ts";

Deno.test("get-user-by-email: metadata", () => {
  assertEquals(action.key, "get-user-by-email");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["email"]);
});

Deno.test("get-user-by-email: calls GET /users/getByEmail on the US host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "user": { "email": "a@b.co", "userId": "u1", "dataFields": { "plan": "pro" } } },
  }]);
  const out = await action.execute({ "email": "abc" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.iterable.com/api/users/getByEmail?email=abc");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    user: { "email": "a@b.co", "userId": "u1", "dataFields": { "plan": "pro" } },
  });
});

Deno.test("get-user-by-email: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "user": { "email": "a@b.co", "userId": "u1", "dataFields": { "plan": "pro" } } },
  }], { connection: { display: { region: "eu" } } });
  await action.execute({ "email": "abc" }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/users/getByEmail?email=abc");
});

Deno.test("get-user-by-email: rejects a missing `email` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "`email` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-user-by-email: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "email": "abc" }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("get-user-by-email: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "email": "abc" }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
