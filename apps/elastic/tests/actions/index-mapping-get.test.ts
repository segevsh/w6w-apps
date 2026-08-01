import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-mapping-get.ts";

const display = { endpoint: "https://example.com:9200" };

Deno.test("index-mapping-get: GETs /<index>/_mapping", async () => {
  const { ctx, calls } = mockCtx([{ body: { "my-index": { mappings: {} } } }], { display });
  const result = await action.execute({ index: "my-index" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/my-index/_mapping");
  assertEquals(result, { "my-index": { mappings: {} } });
});
