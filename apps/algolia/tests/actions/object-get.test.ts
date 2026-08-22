import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-get.ts";

const display = { appId: "APPID" };

Deno.test("object-get: reads one record from the DSN host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { objectID: "1" } }], { display });
  await action.execute!({
    indexName: "products",
    objectID: "1",
    attributesToRetrieve: "name,price",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "appid-dsn.algolia.net");
  assertEquals(url.pathname, "/1/indexes/products/1");
  assertEquals(url.searchParams.get("attributesToRetrieve"), "name,price");
});

Deno.test("object-get: both ids are required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ indexName: "p" }, ctx),
    Error,
    "`objectID`",
  );
  assertEquals(calls.length, 0);
});
