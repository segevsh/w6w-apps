import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-catalog-item.ts";

Deno.test("get-catalog-item: metadata", () => {
  assertEquals(action.key, "get-catalog-item");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["catalogName", "itemId"]);
});

Deno.test("get-catalog-item: calls GET /catalogs/my-cat/items/abc on the US host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "catalogName": "c", "itemId": "i1", "value": { "underlying": {} } },
  }]);
  const out = await action.execute({ "catalogName": "my-cat", "itemId": "abc" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.iterable.com/api/catalogs/my-cat/items/abc");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "catalogName": "c", "itemId": "i1", "value": { "underlying": {} } });
});

Deno.test("get-catalog-item: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "catalogName": "c", "itemId": "i1", "value": { "underlying": {} } },
  }], { connection: { display: { region: "eu" } } });
  await action.execute({ "catalogName": "my-cat", "itemId": "abc" }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/catalogs/my-cat/items/abc");
});

Deno.test("get-catalog-item: rejects a missing `catalogName` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "itemId": "abc" }, ctx);
    },
    Error,
    "`catalogName` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-catalog-item: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "catalogName": "my-cat", "itemId": "abc" }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("get-catalog-item: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "catalogName": "my-cat", "itemId": "abc" }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
