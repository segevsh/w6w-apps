import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-user.ts";

Deno.test("update-user: metadata", () => {
  assertEquals(action.key, "update-user");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), [
    "email",
    "userId",
    "dataFields",
    "mergeNestedObjects",
    "preferUserId",
    "createNewFields",
  ]);
});

Deno.test("update-user: calls POST /users/update on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({
    "email": "abc",
    "userId": "abc",
    "dataFields": { "a": 1 },
    "mergeNestedObjects": true,
    "preferUserId": true,
    "createNewFields": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/users/update");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "email": "abc",
    "userId": "abc",
    "dataFields": { "a": 1 },
    "mergeNestedObjects": true,
    "preferUserId": true,
    "createNewFields": true,
  });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("update-user: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "email": "abc",
    "userId": "abc",
    "dataFields": { "a": 1 },
    "mergeNestedObjects": true,
    "preferUserId": true,
    "createNewFields": true,
  }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/users/update");
});

Deno.test("update-user: rejects an input with no identifier without calling Iterable", async () => {
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

Deno.test("update-user: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "email": "abc",
        "userId": "abc",
        "dataFields": { "a": 1 },
        "mergeNestedObjects": true,
        "preferUserId": true,
        "createNewFields": true,
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("update-user: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "email": "abc",
        "userId": "abc",
        "dataFields": { "a": 1 },
        "mergeNestedObjects": true,
        "preferUserId": true,
        "createNewFields": true,
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
