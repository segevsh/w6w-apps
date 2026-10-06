import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/replace-catalog-item.ts";

Deno.test("replace-catalog-item: metadata", () => {
  assertEquals(action.key, "replace-catalog-item");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(action.params?.map((p) => p.key), ["catalogName", "itemId", "value"]);
});

Deno.test("replace-catalog-item: calls PUT /catalogs/my-cat/items/abc on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }]);
  const out = await action.execute({
    "catalogName": "my-cat",
    "itemId": "abc",
    "value": { "a": 1 },
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.iterable.com/api/catalogs/my-cat/items/abc");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "value": { "a": 1 } });
  assertEquals(out, { "code": "Success", "msg": "ok" });
});

Deno.test("replace-catalog-item: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": "Success", "msg": "ok" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "catalogName": "my-cat", "itemId": "abc", "value": { "a": 1 } }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/catalogs/my-cat/items/abc");
});

Deno.test("replace-catalog-item: rejects a missing `catalogName` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "itemId": "abc", "value": { "a": 1 } }, ctx);
    },
    Error,
    "`catalogName` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("replace-catalog-item: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "catalogName": "my-cat", "itemId": "abc", "value": { "a": 1 } }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("replace-catalog-item: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "catalogName": "my-cat", "itemId": "abc", "value": { "a": 1 } }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
