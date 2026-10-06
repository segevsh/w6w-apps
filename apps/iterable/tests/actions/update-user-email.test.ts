import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-user-email.ts";

Deno.test("update-user-email: metadata", () => {
  assertEquals(action.key, "update-user-email");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), ["currentEmail", "currentUserId", "newEmail"]);
});

Deno.test("update-user-email: calls POST /users/updateEmail on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({ "currentEmail": "abc", "newEmail": "abc" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/users/updateEmail");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "currentEmail": "abc", "newEmail": "abc" });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("update-user-email: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "currentEmail": "abc", "newEmail": "abc" }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/users/updateEmail");
});

Deno.test("update-user-email: rejects a missing `newEmail` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "currentEmail": "abc" }, ctx);
    },
    Error,
    "`newEmail` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-user-email: rejects more than one of currentEmail, currentUserId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "currentEmail": "x", "newEmail": "abc", "currentUserId": "x" }, ctx);
    },
    Error,
    "provide only one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-user-email: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "currentEmail": "abc", "newEmail": "abc" }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("update-user-email: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "currentEmail": "abc", "newEmail": "abc" }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
