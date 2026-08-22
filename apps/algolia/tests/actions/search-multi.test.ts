import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-multi.ts";

const display = { appId: "APPID" };

Deno.test("search-multi: posts the requests array to the wildcard queries path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], { display });
  await action.execute!({ requests: '[{"indexName":"products","query":"a"}]' }, ctx);
  assertEquals(calls[0].url, "https://appid-dsn.algolia.net/1/indexes/*/queries");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{ indexName: "products", query: "a" }],
  });
});

Deno.test("search-multi: an empty requests array is rejected first", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ requests: "[]" }, ctx),
    Error,
    "`requests`",
  );
  assertEquals(calls.length, 0);
});
