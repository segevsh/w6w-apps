import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-update-users.ts";

Deno.test("bulk-update-users: metadata", () => {
  assertEquals(action.key, "bulk-update-users");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), ["users", "createNewFields"]);
});

Deno.test("bulk-update-users: calls POST /users/bulkUpdate on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "successCount": 1, "failCount": 0 } }]);
  const out = await action.execute({ "users": [{ "x": 1 }], "createNewFields": true }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/users/bulkUpdate");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "users": [{ "x": 1 }], "createNewFields": true });
  assertEquals(out, { "successCount": 1, "failCount": 0 });
});

Deno.test("bulk-update-users: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "successCount": 1, "failCount": 0 } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "users": [{ "x": 1 }], "createNewFields": true }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/users/bulkUpdate");
});

Deno.test("bulk-update-users: rejects a missing `users` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "createNewFields": true }, ctx);
    },
    Error,
    "`users` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("bulk-update-users: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "users": [{ "x": 1 }], "createNewFields": true }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("bulk-update-users: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "users": [{ "x": 1 }], "createNewFields": true }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
