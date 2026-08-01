import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-get.ts";

const display = { endpoint: "https://example.com:9200" };

Deno.test("document-get: GETs /<index>/_doc/<id>", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "1", _source: { title: "hi" } } }], { display });
  const result = await action.execute({ index: "my-index", id: "1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/my-index/_doc/1");
  assertEquals(result, { _id: "1", _source: { title: "hi" } });
});

Deno.test("document-get: forwards source include/exclude filters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute(
    { index: "my-index", id: "1", sourceIncludes: "title,body", sourceExcludes: "internal.*" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("_source_includes"), "title,body");
  assertEquals(url.searchParams.get("_source_excludes"), "internal.*");
});
