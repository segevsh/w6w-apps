import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-index.ts";

const display = { endpoint: "https://example.com:9200" };

Deno.test("document-index: PUTs /<index>/_doc/<id> when id is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "42", result: "created" } }], { display });
  const result = await action.execute(
    { index: "my-index", id: "42", document: { title: "hi" } },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/my-index/_doc/42");
  assertEquals(JSON.parse(calls[0].body!), { title: "hi" });
  assertEquals(result, { _id: "42", result: "created" });
});

Deno.test("document-index: POSTs /<index>/_doc (auto ID) when id is omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "auto1" } }], { display });
  await action.execute({ index: "my-index", document: { title: "hi" } }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/my-index/_doc");
});

Deno.test("document-index: passes refresh through as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute(
    { index: "my-index", id: "1", document: {}, refresh: "wait_for" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("refresh"), "wait_for");
});
