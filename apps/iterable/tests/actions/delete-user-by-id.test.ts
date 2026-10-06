import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-user-by-id.ts";

Deno.test("delete-user-by-id: metadata", () => {
  assertEquals(action.key, "delete-user-by-id");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), ["userId"]);
});

Deno.test("delete-user-by-id: calls DELETE /users/byUserId/abc on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({ "userId": "abc" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.iterable.com/api/users/byUserId/abc");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("delete-user-by-id: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "userId": "abc" }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/users/byUserId/abc");
});

Deno.test("delete-user-by-id: rejects a missing `userId` without calling Iterable", async () => {
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

Deno.test("delete-user-by-id: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "userId": "abc" }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("delete-user-by-id: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "userId": "abc" }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
