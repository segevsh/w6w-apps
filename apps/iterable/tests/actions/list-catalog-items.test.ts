import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-catalog-items.ts";

Deno.test("list-catalog-items: metadata", () => {
  assertEquals(action.key, "list-catalog-items");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "catalogName",
    "page",
    "pageSize",
    "orderBy",
    "sortAscending",
  ]);
});

Deno.test("list-catalog-items: calls GET /catalogs/my-cat/items on the US host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "catalogItemsWithProperties": [{ "itemId": "i1" }], "totalItemsCount": 1 },
  }]);
  const out = await action.execute({
    "catalogName": "my-cat",
    "page": 7,
    "pageSize": 7,
    "orderBy": "abc",
    "sortAscending": true,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.iterable.com/api/catalogs/my-cat/items?page=7&pageSize=7&orderBy=abc&sortAscending=true",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "catalogItemsWithProperties": [{ "itemId": "i1" }], "totalItemsCount": 1 });
});

Deno.test("list-catalog-items: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "catalogItemsWithProperties": [{ "itemId": "i1" }], "totalItemsCount": 1 },
  }], { connection: { display: { region: "eu" } } });
  await action.execute({
    "catalogName": "my-cat",
    "page": 7,
    "pageSize": 7,
    "orderBy": "abc",
    "sortAscending": true,
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.eu.iterable.com/api/catalogs/my-cat/items?page=7&pageSize=7&orderBy=abc&sortAscending=true",
  );
});

Deno.test("list-catalog-items: rejects a missing `catalogName` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute(
        { "page": 7, "pageSize": 7, "orderBy": "abc", "sortAscending": true },
        ctx,
      );
    },
    Error,
    "`catalogName` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("list-catalog-items: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "catalogName": "my-cat",
        "page": 7,
        "pageSize": 7,
        "orderBy": "abc",
        "sortAscending": true,
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("list-catalog-items: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "catalogName": "my-cat",
        "page": 7,
        "pageSize": 7,
        "orderBy": "abc",
        "sortAscending": true,
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
