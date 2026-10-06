import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-catalogs.ts";

Deno.test("list-catalogs: metadata", () => {
  assertEquals(action.key, "list-catalogs");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["page", "pageSize"]);
});

Deno.test("list-catalogs: calls GET /catalogs on the US host", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "catalogNames": [{ "name": "c" }], "totalCatalogsCount": 1 },
  }]);
  const out = await action.execute({ "page": 7, "pageSize": 7 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.iterable.com/api/catalogs?page=7&pageSize=7");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "catalogNames": [{ "name": "c" }], "totalCatalogsCount": 1 });
});

Deno.test("list-catalogs: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "catalogNames": [{ "name": "c" }], "totalCatalogsCount": 1 },
  }], { connection: { display: { region: "eu" } } });
  await action.execute({ "page": 7, "pageSize": 7 }, ctx);
  assertEquals(calls[0].url, "https://api.eu.iterable.com/api/catalogs?page=7&pageSize=7");
});

Deno.test("list-catalogs: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "page": 7, "pageSize": 7 }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("list-catalogs: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "page": 7, "pageSize": 7 }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});
