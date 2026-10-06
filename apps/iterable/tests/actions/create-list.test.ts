import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-list.ts";

Deno.test("create-list: metadata", () => {
  assertEquals(action.key, "create-list");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params?.map((p) => p.key), ["name", "description"]);
});

Deno.test("create-list: calls POST /lists on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "listId": 42 } }]);
  const out = await action.execute({ "name": "abc", "description": "abc" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.iterable.com/api/lists");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "name": "abc", "description": "abc" });
  assertEquals(out, { "listId": 42 });
});

Deno.test("create-list: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "listId": 42 } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "name": "abc", "description": "abc" }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/lists");
});

Deno.test("create-list: rejects a missing `name` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "description": "abc" }, ctx);
    },
    Error,
    "`name` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-list: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "name": "abc", "description": "abc" }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("create-list: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "name": "abc", "description": "abc" }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
