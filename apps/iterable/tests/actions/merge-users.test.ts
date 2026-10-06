import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/merge-users.ts";

Deno.test("merge-users: metadata", () => {
  assertEquals(action.key, "merge-users");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params?.map((p) => p.key), [
    "sourceEmail",
    "sourceUserId",
    "destinationEmail",
    "destinationUserId",
  ]);
});

Deno.test("merge-users: calls POST /users/merge on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({ "sourceEmail": "abc", "destinationEmail": "abc" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/users/merge");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "sourceEmail": "abc", "destinationEmail": "abc" });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("merge-users: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "sourceEmail": "abc", "destinationEmail": "abc" }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/users/merge");
});

Deno.test("merge-users: rejects an input with no identifier without calling Iterable", async () => {
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

Deno.test("merge-users: rejects more than one of sourceEmail, sourceUserId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute(
        { "sourceEmail": "x", "destinationEmail": "abc", "sourceUserId": "x" },
        ctx,
      );
    },
    Error,
    "provide only one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("merge-users: rejects more than one of destinationEmail, destinationUserId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({
        "sourceEmail": "abc",
        "destinationEmail": "x",
        "destinationUserId": "x",
      }, ctx);
    },
    Error,
    "provide only one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("merge-users: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "sourceEmail": "abc", "destinationEmail": "abc" }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("merge-users: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "sourceEmail": "abc", "destinationEmail": "abc" }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
