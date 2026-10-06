import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscribe-to-list.ts";

Deno.test("subscribe-to-list: metadata", () => {
  assertEquals(action.key, "subscribe-to-list");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), [
    "listId",
    "subscribers",
    "updateExistingUsersOnly",
  ]);
});

Deno.test("subscribe-to-list: calls POST /lists/subscribe on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "successCount": 1, "failCount": 0 } }]);
  const out = await action.execute({
    "listId": 7,
    "subscribers": [{ "x": 1 }],
    "updateExistingUsersOnly": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/lists/subscribe");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "listId": 7,
    "subscribers": [{ "x": 1 }],
    "updateExistingUsersOnly": true,
  });
  assertEquals(out, { "successCount": 1, "failCount": 0 });
});

Deno.test("subscribe-to-list: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "successCount": 1, "failCount": 0 } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "listId": 7,
    "subscribers": [{ "x": 1 }],
    "updateExistingUsersOnly": true,
  }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/lists/subscribe");
});

Deno.test("subscribe-to-list: rejects a missing `listId` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "subscribers": [{ "x": 1 }], "updateExistingUsersOnly": true }, ctx);
    },
    Error,
    "`listId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("subscribe-to-list: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "listId": 7,
        "subscribers": [{ "x": 1 }],
        "updateExistingUsersOnly": true,
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("subscribe-to-list: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "listId": 7,
        "subscribers": [{ "x": 1 }],
        "updateExistingUsersOnly": true,
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
