import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-user-by-email.ts";

Deno.test("delete-user-by-email: metadata", () => {
  assertEquals(action.key, "delete-user-by-email");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), ["email"]);
});

Deno.test("delete-user-by-email: calls DELETE /users/abc on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({ "email": "abc" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.iterable.com/api/users/abc");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("delete-user-by-email: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "email": "abc" }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/users/abc");
});

Deno.test("delete-user-by-email: rejects a missing `email` without calling Iterable", async () => {
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

Deno.test("delete-user-by-email: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "email": "abc" }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("delete-user-by-email: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "email": "abc" }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
