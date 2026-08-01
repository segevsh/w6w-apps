import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-update.ts";

const display = { endpoint: "https://example.com:9200" };

Deno.test("document-update: POSTs /<index>/_update/<id> with a doc merge body", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "updated" } }], { display });
  const result = await action.execute(
    { index: "my-index", id: "1", doc: { title: "new title" } },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/my-index/_update/1");
  assertEquals(JSON.parse(calls[0].body!), { doc: { title: "new title" }, doc_as_upsert: false });
  assertEquals(result, { result: "updated" });
});

Deno.test("document-update: docAsUpsert flows into the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute(
    { index: "my-index", id: "1", doc: { a: 1 }, docAsUpsert: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { doc: { a: 1 }, doc_as_upsert: true });
});
