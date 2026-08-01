import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete.ts";

const display = { endpoint: "https://example.com:9200" };

Deno.test("document-delete: DELETEs /<index>/_doc/<id>", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "deleted" } }], { display });
  const result = await action.execute({ index: "my-index", id: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/my-index/_doc/1");
  assertEquals(result, { result: "deleted" });
});

Deno.test("document-delete: passes refresh through as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute({ index: "my-index", id: "1", refresh: "true" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("refresh"), "true");
});
